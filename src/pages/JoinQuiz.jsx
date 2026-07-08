import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import AvatarRenderer from "../components/AvatarRenderer";
import VirtualAvatarHead from "../components/VirtualAvatarHead";
import "../styles/JoinQuiz.css";

function JoinQuiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const [playMode, setPlayMode] = useState(
    localStorage.getItem("quizPlayMode") || "normal"
  );

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));

    const roomFromUrl = searchParams.get("room");

    if (roomFromUrl) {
      setRoomCode(roomFromUrl.toUpperCase());
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [navigate, searchParams]);

  function getFinalPlayMode(targetSession = session) {
    const gameMode = targetSession?.game_mode || "choice";

    if (gameMode === "normal") return "normal";
    if (gameMode === "ar") return "ar";

    return localStorage.getItem("quizPlayMode") || playMode || "normal";
  }

  function goToGame(targetSession = session) {
    if (!targetSession?.session_id) return;

    const finalMode = getFinalPlayMode(targetSession);

    if (finalMode === "ar") {
      navigate(`/ar-quiz/${targetSession.session_id}`);
    } else {
      navigate(`/quiz/game/${targetSession.session_id}`);
    }
  }

  async function updatePlayMode(mode) {
    if (mode === "ar") {
      const ok = await checkCameraPermission();

      if (!ok) {
        setPlayMode("normal");
        localStorage.setItem("quizPlayMode", "normal");
        return;
      }
    }

    setPlayMode(mode);
    localStorage.setItem("quizPlayMode", mode);
  }

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

      if (joinedSession.game_mode === "ar") {
        updatePlayMode("ar");
      }

      if (joinedSession.game_mode === "normal") {
        updatePlayMode("normal");
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

    socket.on("connect", () => {
      socket.emit("join-session", {
        sessionId: Number(sessionId),
        userId: Number(userId),
        role: "player",
      });
    });

    socket.on("session-sync", (data) => {
      setSession(data.session);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setPlayers(data.leaderboard || []);

      localStorage.setItem("currentGameSession", JSON.stringify(data.session));

      if (data.session?.game_mode === "ar") {
        updatePlayMode("ar");
      }

      if (data.session?.game_mode === "normal") {
        updatePlayMode("normal");
      }

      if (data.session?.game_finished) {
        navigate(`/quiz/leaderboard/${data.session.session_id}`);
        return;
      }

      if (data.session?.started_at && !data.session?.game_finished) {
        goToGame(data.session);
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
      localStorage.setItem("currentGameSession", JSON.stringify(session));
      goToGame(session);
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

  function getModeLabel(mode) {
    if (mode === "normal") return "普通模式";
    if (mode === "ar") return "AR 模式";
    return "玩家自行選擇";
  }

  async function checkCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      stream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (err) {
      alert(
        "無法開啟相機。若要使用 AR 模式，請允許瀏覽器相機權限，或改用普通模式。"
      );

      return false;
    }
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
    const gameMode = session?.game_mode || "choice";
    const canChooseMode = gameMode === "choice";

    return (
      <div className="join-quiz-page waiting-room-page">
        <div className="join-quiz-card joined waiting-room-card">
          <div className="waiting-room-summary">
            <div>
              <span>測驗</span>
              <strong>{quiz?.title || "載入中..."}</strong>
            </div>
            <div>
              <span>題目</span>
              <strong>{questions.length} 題</strong>
            </div>
            <div>
              <span>玩家</span>
              <strong>{players.length} 人</strong>
            </div>
            <div>
              <span>模式</span>
              <strong>{getModeLabel(gameMode)}</strong>
            </div>
          </div>

          {!session?.started_at && (
            <div className="mode-select-box">
              <h3>選擇答題模式</h3>
              {playMode === "ar" && (
                <p className="mode-warning">
                  AR 模式需要相機權限。請確認瀏覽器已允許使用相機。
                </p>
              )}

              <button
                type="button"
                className={
                  playMode === "normal"
                    ? "mode-select-btn active"
                    : "mode-select-btn"
                }
                onClick={() => updatePlayMode("normal")}
                disabled={!canChooseMode && gameMode !== "normal"}
              >
                普通模式
                <span>使用一般 Quiz 畫面答題</span>
              </button>

              <button
                type="button"
                className={
                  playMode === "ar"
                    ? "mode-select-btn active"
                    : "mode-select-btn"
                }
                onClick={() => updatePlayMode("ar")}
                disabled={!canChooseMode && gameMode !== "ar"}
              >
                AR 模式
                <span>使用相機與手指指向答案</span>
              </button>

              {!canChooseMode && (
                <p className="joined-player-hint">
                  本場測驗由主持人指定為「{getModeLabel(gameMode)}」。
                </p>
              )}
            </div>
          )}

          <div className="waiting-avatar-stage">
            {players.length === 0 ? (
              <p className="joined-player-hint">等待玩家加入...</p>
            ) : (
              <div className="waiting-avatar-list">
                {players.map((record) => {
                  const user = record.users;

                  return (
                    <div
                      className="waiting-avatar-player"
                      key={record.record_id}
                    >
                      <strong>{user?.name || "未知玩家"}</strong>
                      <AvatarRenderer
                        config={user?.avatar_config}
                        className="waiting-avatar-renderer"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="waiting-player-strip">
            {players.map((record, index) => {
              const user = record.users;

              return (
                <div className="waiting-player-chip" key={record.record_id}>
                  <span>{index + 1}</span>
                  <VirtualAvatarHead
                    config={user?.avatar_config}
                    className="waiting-player-head"
                  />
                  <strong>{user?.name || "未知玩家"}</strong>
                </div>
              );
            })}
          </div>

          <div className="waiting-message">
            {session?.started_at
              ? "遊戲已開始，正在進入答題畫面..."
              : "等待主持人開始遊戲..."}
          </div>

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
