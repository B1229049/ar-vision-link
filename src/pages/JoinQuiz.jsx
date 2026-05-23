import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/JoinQuiz.css";

function JoinQuiz() {
  const navigate = useNavigate();

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);

  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
  }, [navigate]);

  async function handleJoinQuiz() {
    if (!currentUser) return;

    if (!roomCode.trim()) {
      alert("請輸入房號");
      return;
    }

    setJoining(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/join/${roomCode.trim()}`
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("加入失敗：" + (result.error || "找不到房間"));
        setJoining(false);
        return;
      }

      localStorage.setItem(
        "currentGameSession",
        JSON.stringify(result.session)
      );

      alert("加入成功！");

      navigate(`/quiz/lobby/${result.session.session_id}`);
    } catch (err) {
      console.error(err);
      alert("加入測驗時發生錯誤");
    }

    setJoining(false);
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
            onChange={(e) =>
              setRoomCode(e.target.value.toUpperCase())
            }
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

        <button
          className="join-btn secondary"
          onClick={() => navigate("/quiz")}
        >
          返回 Quiz Center
        </button>
      </div>
    </div>
  );
}

export default JoinQuiz;