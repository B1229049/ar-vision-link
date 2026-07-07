import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/HostLobby.css";

function HostLobby() {
  const navigate = useNavigate();

  const BACKEND_URL =
    import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

  const socketRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");

  const [gameMode, setGameMode] = useState("choice");

  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [playerPanelOpen, setPlayerPanelOpen] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);
    loadMyQuizzes(user.id);
  }, [navigate]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  async function loadMyQuizzes(userId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/quizzes/host/${userId}`);
      const result = await response.json();

      if (!response.ok || result.error) {
        alert("載入測驗失敗：" + (result.error || "未知錯誤"));
        setLoading(false);
        return;
      }

      setQuizzes(result.quizzes || []);

      if (result.quizzes?.length > 0) {
        setSelectedQuizId(String(result.quizzes[0].quiz_id));
      }
    } catch (err) {
      console.error(err);
      alert("載入測驗時發生錯誤");
    }

    setLoading(false);
  }

  async function createGameSession() {
    if (!selectedQuizId) {
      alert("請先選擇一個測驗");
      return;
    }

    if (!currentUser) {
      alert("找不到登入使用者");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/game-sessions/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quiz_id: Number(selectedQuizId),
          game_mode: gameMode,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("建立房間失敗：" + (result.error || "未知錯誤"));
        setCreating(false);
        return;
      }

      const createdSession = {
        ...result.session,
        game_mode:
          result.session?.game_mode ||
          gameMode,
      };

      setSession(createdSession);

      localStorage.setItem(
        "hostGameSession",
        JSON.stringify(createdSession)
      );

      connectSocket(createdSession.session_id, currentUser.id);
    } catch (err) {
      console.error(err);
      alert("建立房間時發生錯誤");
    }

    setCreating(false);
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
        role: "host",
      });
    });

    socket.on("session-sync", (data) => {
      const syncedSession = {
        ...data.session,
        game_mode:
          data.session?.game_mode ||
          gameMode,
      };

      setSession(syncedSession);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setPlayers(data.leaderboard || []);

      localStorage.setItem(
        "hostGameSession",
        JSON.stringify(syncedSession)
      );

      if (syncedSession?.game_finished) {
        navigate(`/quiz/leaderboard/${syncedSession.session_id}`);
        return;
      }

      if (syncedSession?.started_at && !syncedSession?.game_finished) {
        navigate(`/quiz/host-console/${syncedSession.session_id}`);
      }
    });

    socket.on("player-joined", async () => {
      await loadPlayers(sessionId);
    });

    socket.on("leaderboard-updated", ({ leaderboard }) => {
      setPlayers(leaderboard || []);
    });

    socket.on("game-started", ({ session }) => {
      setStarting(false);

      const startedSession = {
        ...session,
        game_mode:
          session?.game_mode ||
          gameMode,
      };

      localStorage.setItem(
        "hostGameSession",
        JSON.stringify(startedSession)
      );

      navigate(`/quiz/host-console/${startedSession.session_id}`);
    });

    socket.on("game-finished", ({ session }) => {
      navigate(`/quiz/leaderboard/${session.session_id}`);
    });

    socket.on("socket-error", (data) => {
      alert(data.error || "Socket 發生錯誤");
      setStarting(false);
    });

    socket.emit("join-session", {
      sessionId: Number(sessionId),
      userId: Number(userId),
      role: "host",
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
      console.error("載入玩家失敗：", err);
    }
  }

  function copyRoomCode() {
    if (!session?.room_code) return;

    navigator.clipboard.writeText(session.room_code);
    alert("房號已複製！");
  }

  function getJoinUrl() {
    if (!session?.room_code) return "";

    const basePath = import.meta.env.BASE_URL || "/";
    const cleanBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;

    return `${window.location.origin}${cleanBasePath}quiz/join?room=${session.room_code}`;
  }

  async function copyJoinUrl() {
    const joinUrl = getJoinUrl();
    if (!joinUrl) return;

    await navigator.clipboard.writeText(joinUrl);
    alert("房間網址已複製！");
  }

  function startGame() {
    if (!session?.session_id || starting) return;

    if (players.length === 0) {
      const ok = window.confirm("目前沒有玩家加入，仍然要開始嗎？");
      if (!ok) return;
    }

    setStarting(true);

    socketRef.current?.emit("start-game", {
      sessionId: Number(session.session_id),
    });
  }

  function getModeLabel(mode) {
    if (mode === "normal") return "普通模式";
    if (mode === "ar") return "AR 模式";
    return "玩家自行選擇";
  }

  if (loading) {
    return (
      <div className="host-lobby-page">
        <div className="host-lobby-card">
          <p>載入測驗中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="host-lobby-page">
      <div className="host-lobby-card">
        <h2>主持遊戲</h2>

        <p className="host-subtitle">
          選擇你建立的測驗，設定答題模式，產生房號讓玩家加入。
        </p>

        {!session && (
          <>
            {quizzes.length === 0 ? (
              <div className="empty-box">
                <p>你目前還沒有建立任何測驗。</p>

                <button
                  className="host-btn primary"
                  onClick={() => navigate("/quiz/create")}
                >
                  建立第一個測驗
                </button>
              </div>
            ) : (
              <>
                <div className="host-field">
                  <label>選擇測驗</label>

                  <select
                    value={selectedQuizId}
                    onChange={(e) => setSelectedQuizId(e.target.value)}
                  >
                    {quizzes.map((quiz) => (
                      <option key={quiz.quiz_id} value={quiz.quiz_id}>
                        {quiz.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="host-field">
                  <label>答題模式</label>

                  <div className="host-mode-box">
                    <button
                      type="button"
                      className={
                        gameMode === "normal"
                          ? "host-mode-btn active"
                          : "host-mode-btn"
                      }
                      onClick={() => setGameMode("normal")}
                    >
                      普通模式
                      <span>玩家只能使用一般答題畫面</span>
                    </button>

                    <button
                      type="button"
                      className={
                        gameMode === "ar"
                          ? "host-mode-btn active"
                          : "host-mode-btn"
                      }
                      onClick={() => setGameMode("ar")}
                    >
                      AR 模式
                      <span>玩家只能使用 AR Camera 答題</span>
                    </button>

                    <button
                      type="button"
                      className={
                        gameMode === "choice"
                          ? "host-mode-btn active"
                          : "host-mode-btn"
                      }
                      onClick={() => setGameMode("choice")}
                    >
                      玩家自行選擇
                      <span>玩家開始前自行選普通或 AR</span>
                    </button>
                  </div>
                </div>

                <button
                  className="host-btn primary"
                  onClick={createGameSession}
                  disabled={creating}
                >
                  {creating ? "建立房間中..." : "建立遊戲房間"}
                </button>
              </>
            )}
          </>
        )}

        {session && (
          <div className="host-active-layout">
            <div className="room-box">
              <div className="room-url-row">
                <div>
                  <p className="room-url-label">房間網址</p>
                  <div className="room-url-text">{getJoinUrl()}</div>
                </div>

                <button
                  type="button"
                  className="room-copy-btn"
                  onClick={copyJoinUrl}
                >
                  複製
                </button>
              </div>

              <p className="room-label">房號 Room Code</p>

              <div className="room-code">{session.room_code}</div>

              <div className="room-qr-panel">
                <img
                  className="room-qr-img"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    getJoinUrl()
                  )}`}
                  alt="加入房間 QR Code"
                />

                <button
                  type="button"
                  className="room-copy-btn wide"
                  onClick={copyJoinUrl}
                >
                  複製房間網址
                </button>
              </div>

              <p className="room-hint">
                玩家掃描 QR Code 或開啟網址後，仍需完成臉部登入才可加入房間。
              </p>

              <div className="host-session-info">
                <div>
                  <span>測驗</span>
                  <strong>{quiz?.title || "載入中..."}</strong>
                </div>

                <div>
                  <span>題目數</span>
                  <strong>{questions.length} 題</strong>
                </div>

                <div>
                  <span>玩家</span>
                  <strong>{players.length} 人</strong>
                </div>

                <div>
                  <span>模式</span>
                  <strong>{getModeLabel(session.game_mode || gameMode)}</strong>
                </div>

                <div>
                  <span>狀態</span>
                  <strong>{session.started_at ? "已開始" : "等待中"}</strong>
                </div>
              </div>

              <div className="host-player-cloud">
                <div className="host-player-cloud-head">
                  <h3>已加入玩家</h3>
                  <button
                    type="button"
                    className="host-player-panel-toggle"
                    onClick={() => setPlayerPanelOpen((open) => !open)}
                  >
                    {playerPanelOpen ? "隱藏名單" : "查看名單"}
                  </button>
                </div>

                {players.length === 0 ? (
                  <p className="host-player-hint">目前還沒有玩家加入。</p>
                ) : (
                  <div className="host-player-cloud-list">
                    {players.map((record) => {
                      const user = record.users;

                      return (
                        <div
                          className="host-player-cloud-item"
                          key={record.record_id}
                        >
                          <strong>{user?.name || "未知玩家"}</strong>

                          <div className="host-player-cloud-avatar">
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} alt="avatar" />
                            ) : (
                              user?.name?.charAt(0) || "U"
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button className="host-btn secondary" onClick={copyRoomCode}>
                複製房號
              </button>

              <button
                className="host-btn primary"
                onClick={startGame}
                disabled={starting}
              >
                {starting ? "開始中..." : "開始遊戲"}
              </button>
            </div>

            {playerPanelOpen && (
              <aside className="host-player-side-panel">
                <h3>玩家名單</h3>

                {players.length === 0 ? (
                  <p className="host-player-hint">目前還沒有玩家加入。</p>
                ) : (
                  <div className="host-player-side-list">
                    {players.map((record, index) => {
                      const user = record.users;

                      return (
                        <div
                          className="host-player-side-item"
                          key={record.record_id}
                        >
                          <span className="host-player-number">
                            {index + 1}
                          </span>

                          <div className="host-player-avatar">
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} alt="avatar" />
                            ) : (
                              user?.name?.charAt(0) || "U"
                            )}
                          </div>

                          <strong>{user?.name || "未知玩家"}</strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </aside>
            )}
          </div>
        )}

        <button className="host-btn ghost" onClick={() => navigate("/quiz")}>
          返回 AR Vision Link
        </button>
      </div>
    </div>
  );
}

export default HostLobby;
