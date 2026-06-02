import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/JoinQuiz.css";

function JoinQuiz() {
  const navigate = useNavigate();

  const BACKEND_URL =
    import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

  const socketRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [joined, setJoined] = useState(false);
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));

    return () => {
      socketRef.current?.disconnect();
    };
  }, [navigate]);

  async function handleJoinQuiz() {
    if (!currentUser) return;

    if (!roomCode.trim()) {
      alert("請輸入房號");
      return;
    }

    setJoining(true);

    try {
      const joinResponse = await fetch(
        `${BACKEND_URL}/api/game-sessions/join/${roomCode.trim()}`
      );

      const joinResult = await joinResponse.json();

      if (!joinResponse.ok || joinResult.error) {
        alert("加入失敗：" + (joinResult.error || "找不到房間"));
        setJoining(false);
        return;
      }

      const joinedSession = joinResult.session;

      const recordResponse = await fetch(
        `${BACKEND_URL}/api/player-records/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: joinedSession.session_id,
            user_id: currentUser.id,
          }),
        }
      );

      const recordResult = await recordResponse.json();

      if (!recordResponse.ok || recordResult.error) {
        alert("加入玩家紀錄失敗：" + (recordResult.error || "未知錯誤"));
        setJoining(false);
        return;
      }

      localStorage.setItem("currentGameSession", JSON.stringify(joinedSession));
      localStorage.setItem(
        "currentPlayerRecord",
        JSON.stringify(recordResult.record)
      );

      setSession(joinedSession);
      setJoined(true);

      connectSocket(joinedSession.session_id, currentUser.id);
    } catch (err) {
      console.error(err);
      alert("加入測驗時發生錯誤");
    }

    setJoining(false);
  }

  function connectSocket(sessionId, userId) {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(BACKEND_URL, {
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.emit("join-session", {
      sessionId: Number(sessionId),
      userId: Number(userId),
      role: "player",
    });

    socket.on("session-sync", (data) => {
      setSession(data.session);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setPlayers(data.leaderboard || []);

      if (data.session?.game_finished) {
        navigate(`/quiz/leaderboard/${data.session.session_id}`);
        return;
      }

      if (data.session?.started_at && !data.session?.game_finished) {
        setSession(data.session);
        return;
      }
    });

    socket.on("player-joined", async () => {
      await loadPlayers(sessionId);
    });

    socket.on("leaderboard-updated", ({ leaderboard }) => {
      setPlayers(leaderboard || []);
    });

    socket.on("game-started", ({ session }) => {
      setSession(session);
    });

    socket.on("game-finished", ({ session }) => {
      navigate(`/quiz/leaderboard/${session.session_id}`);
    });

    socket.on("socket-error", (data) => {
      alert(data.error || "Socket 發生錯誤");
    });
  }

  async function loadPlayers(sessionIdValue = session?.session_id) {
    if (!sessionIdValue) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/leaderboard/${sessionIdValue}`
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setPlayers(result.leaderboard || []);
      }
    } catch (err) {
      console.error("載入玩家列表失敗：", err);
    }
  }

  function goNormalMode() {
    if (!session?.session_id) {
      alert("找不到遊戲場次");
      return;
    }

    navigate(`/quiz/game/${session.session_id}`);
  }

  function goARMode() {
    if (!session?.session_id) {
      alert("找不到遊戲場次");
      return;
    }

    navigate(`/ar-quiz/${session.session_id}`);
  }

  function leaveRoom() {
    socketRef.current?.disconnect();
    socketRef.current = null;

    setJoined(false);
    setSession(null);
    setQuiz(null);
    setQuestions([]);
    setPlayers([]);
    setRoomCode("");

    localStorage.removeItem("currentGameSession");
    localStorage.removeItem("currentPlayerRecord");
  }

  if (!currentUser) {
    return (
      <div className="join-quiz-page">
        <div className="join-quiz-card">
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="join-quiz-page">
        <div className="join-quiz-card joined">
          <h2>已加入房間</h2>

          <p className="join-quiz-subtitle">
            等待主持人開始遊戲。開始後可選擇普通模式或 AR 模式答題。
          </p>

          <div className="joined-room-panel">
            <p className="joined-room-label">Room Code</p>
            <div className="joined-room-code">{session?.room_code}</div>
          </div>

          <div className="joined-info-box">
            <div className="joined-info-row">
              <span>測驗名稱</span>
              <strong>{quiz?.title || "載入中..."}</strong>
            </div>

            <div className="joined-info-row">
              <span>題目數量</span>
              <strong>{questions.length} 題</strong>
            </div>

            <div className="joined-info-row">
              <span>玩家數量</span>
              <strong>{players.length} 人</strong>
            </div>

            <div className="joined-info-row">
              <span>狀態</span>
              <strong>{session?.started_at ? "已開始" : "等待中"}</strong>
            </div>
          </div>

          <div className="joined-player-box">
            <h3>玩家列表</h3>

            {players.length === 0 ? (
              <p className="joined-player-hint">目前還沒有玩家。</p>
            ) : (
              <div className="joined-player-list">
                {players.map((record) => {
                  const user = record.users;

                  return (
                    <div className="joined-player-item" key={record.record_id}>
                      <div className="joined-player-avatar">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" />
                        ) : (
                          user?.name?.charAt(0) || "U"
                        )}
                      </div>

                      <div className="joined-player-info">
                        <strong>{user?.name || "未知玩家"}</strong>
                        <span>@{user?.nickname || "unknown"}</span>
                      </div>

                      <div className="joined-player-score">
                        {record.score || 0} 分
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="waiting-message">
            {session?.started_at
              ? "遊戲已開始，請選擇答題模式。"
              : "等待主持人開始遊戲..."}
          </div>

          {session?.started_at && !session?.game_finished && (
            <>
              <button className="join-btn primary" onClick={goNormalMode}>
                普通模式答題
              </button>

              <button className="join-btn primary" onClick={goARMode}>
                AR 模式答題
              </button>
            </>
          )}

          <button className="join-btn secondary" onClick={leaveRoom}>
            離開房間
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-quiz-page">
      <div className="join-quiz-card">
        <div className="join-quiz-avatar">
          {currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt="avatar" />
          ) : (
            currentUser.name?.charAt(0) || "U"
          )}
        </div>

        <h2>加入測驗</h2>

        <p className="join-quiz-subtitle">
          輸入主持人提供的房號，加入即時 Quiz 遊戲。
        </p>

        <div className="join-field">
          <label>房號 Room Code</label>

          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="例如：ABCD12"
            maxLength={12}
          />
        </div>

        <button
          className="join-btn primary"
          onClick={handleJoinQuiz}
          disabled={joining}
        >
          {joining ? "加入中..." : "加入測驗"}
        </button>

        <button className="join-btn secondary" onClick={() => navigate("/quiz")}>
          返回 AR Vision Link
        </button>
      </div>
    </div>
  );
}

export default JoinQuiz;