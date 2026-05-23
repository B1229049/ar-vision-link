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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
    loadLobby();

    const timer = setInterval(loadLobby, 2500);

    return () => clearInterval(timer);
  }, [sessionId]);

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
    } catch (err) {
      console.error(err);
      alert("載入等待室時發生錯誤");
    }

    setLoading(false);
  }

  function copyRoomCode() {
    if (!session?.room_code) return;

    navigator.clipboard.writeText(session.room_code);
    alert("房號已複製！");
  }

  function startGame() {
    alert("下一步會進入 QuizGame.jsx");
    navigate(`/quiz/game/${session.session_id}`);
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

        <p className="waiting-subtitle">
          {quiz?.title || "未命名測驗"}
        </p>

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
            <span>Session ID</span>
            <strong>{session?.session_id}</strong>
          </div>

          <div className="info-row">
            <span>身分</span>
            <strong>{isHost ? "主持人" : "玩家"}</strong>
          </div>
        </div>

        <div className="player-box">
          <h3>玩家列表</h3>

          <p className="player-hint">
            玩家紀錄 API 下一步建立後，這裡會顯示已加入玩家。
          </p>
        </div>

        {isHost ? (
          <button className="waiting-btn primary" onClick={startGame}>
            開始遊戲
          </button>
        ) : (
          <div className="waiting-message">
            等待主持人開始遊戲...
          </div>
        )}

        <button className="waiting-btn ghost" onClick={() => navigate("/quiz")}>
          返回 Quiz Center
        </button>
      </div>
    </div>
  );
}

export default WaitingLobby;