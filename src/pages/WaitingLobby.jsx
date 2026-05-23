import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/WaitingLobby.css";

function WaitingLobby() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));

    loadLobby();

    const timer = setInterval(() => {
      loadLobby();
      loadPlayers();
    }, 2500);

    return () => clearInterval(timer);
  }, [sessionId, navigate]);

  async function loadLobby() {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${sessionId}`
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("載入等待室失敗：" + (result.error || "未知錯誤"));
        navigate("/quiz");
        return;
      }

      setSession(result.session);
      setQuiz(result.quiz);
      setQuestions(result.questions || []);

      if (result.session?.started_at) {
        navigate(`/quiz/game/${result.session.session_id}`);
        return;
      }

      await loadPlayers();
    } catch (err) {
      console.error(err);
      alert("載入等待室時發生錯誤");
    }

    setLoading(false);
  }

  async function loadPlayers() {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/player-records/session/${sessionId}`
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error("載入玩家列表失敗：", result.error);
        return;
      }

      setPlayers(result.players || []);
    } catch (err) {
      console.error("載入玩家列表時發生錯誤：", err);
    }
  }

  function copyRoomCode() {
    if (!session?.room_code) return;

    navigator.clipboard.writeText(session.room_code);
    alert("房號已複製！");
  }

  async function startGame() {
    if (!session?.session_id) return;

    if (players.length === 0) {
      const ok = window.confirm("目前沒有玩家加入，仍然要開始嗎？");
      if (!ok) return;
    }

    setStarting(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${session.session_id}/start`,
        {
          method: "PUT",
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("開始遊戲失敗：" + (result.error || "未知錯誤"));
        setStarting(false);
        return;
      }

      localStorage.setItem("currentGameSession", JSON.stringify(result.session));

      navigate(`/quiz/game/${result.session.session_id}`);
    } catch (err) {
      console.error(err);
      alert("開始遊戲時發生錯誤");
    }

    setStarting(false);
  }

  if (loading) {
    return (
      <div className="waiting-lobby-page">
        <div className="waiting-lobby-card">
          <p>載入等待室中...</p>
        </div>
      </div>
    );
  }

  const isHost = currentUser?.id === quiz?.host_id;

  return (
    <div className="waiting-lobby-page">
      <div className="waiting-lobby-card">
        <h2>{isHost ? "主持人等待室" : "玩家等待室"}</h2>

        <p className="waiting-subtitle">{quiz?.title || "未命名測驗"}</p>

        <div className="room-panel">
          <p className="room-label">Room Code</p>

          <div className="room-code">{session?.room_code}</div>

          <button className="waiting-btn secondary" onClick={copyRoomCode}>
            複製房號
          </button>
        </div>

        <div className="quiz-info-box">
          <div className="info-row">
            <span>題目數量</span>
            <strong>{questions.length} 題</strong>
          </div>

          <div className="info-row">
            <span>玩家數量</span>
            <strong>{players.length} 人</strong>
          </div>

          <div className="info-row">
            <span>Session ID</span>
            <strong>{session?.session_id}</strong>
          </div>

          <div className="info-row">
            <span>狀態</span>
            <strong>{session?.started_at ? "已開始" : "等待中"}</strong>
          </div>

          <div className="info-row">
            <span>身分</span>
            <strong>{isHost ? "主持人" : "玩家"}</strong>
          </div>
        </div>

        <div className="player-box">
          <h3>玩家列表</h3>

          {players.length === 0 ? (
            <p className="player-hint">目前還沒有玩家加入。</p>
          ) : (
            <div className="player-list">
              {players.map((record) => {
                const user = record.users;

                return (
                  <div className="player-item" key={record.record_id}>
                    <div className="player-avatar">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" />
                      ) : (
                        user?.name?.charAt(0) || "U"
                      )}
                    </div>

                    <div className="player-info">
                      <strong>{user?.name || "未知玩家"}</strong>
                      <span>@{user?.nickname || "unknown"}</span>
                    </div>

                    <div className="player-score">{record.score || 0} 分</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isHost ? (
          <button
            className="waiting-btn primary"
            onClick={startGame}
            disabled={starting}
          >
            {starting ? "開始中..." : "開始遊戲"}
          </button>
        ) : (
          <div className="waiting-message">等待主持人開始遊戲...</div>
        )}

        <button className="waiting-btn ghost" onClick={() => navigate("/quiz")}>
          返回 Quiz Center
        </button>
      </div>
    </div>
  );
}

export default WaitingLobby;