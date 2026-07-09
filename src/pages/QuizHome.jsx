import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/QuizHome.css";

function QuizHome() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
  }, [navigate]);

  if (!currentUser) {
    return (
      <div className="quiz-home-page">
        <div className="quiz-home-card">
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-home-page">
      <div className="quiz-home-card">
        <div className="quiz-avatar">
          {currentUser.profile_url ? (
            <img src={currentUser.profile_url} alt="profile" />
          ) : (
            currentUser.name?.charAt(0) || "U"
          )}
        </div>

        <h2>Quiz Center</h2>

        <p className="quiz-subtitle">
          歡迎回來，{currentUser.name}！你可以建立新的測驗，或加入別人的遊戲。
        </p>

        <div className="quiz-actions">
          <button
            className="quiz-btn primary"
            onClick={() => navigate("/quiz/host")}
          >
            主持遊戲
          </button>
          
          <button
            className="quiz-btn primary"
            onClick={() => navigate("/quiz/create")}
          >
            建立測驗
          </button>

          <button className="quiz-btn secondary" onClick={() => navigate("/quiz/manage")}>
            編輯 Quiz
          </button>

          <button
            className="quiz-btn secondary"
            onClick={() => navigate("/quiz/join")}
          >
            加入測驗
          </button>

          <button
            className="quiz-btn secondary"
            onClick={() => navigate("/quiz/history")}
          >
            歷史紀錄
          </button>

          <button
            className="quiz-btn ghost"
            onClick={() => navigate("/profile")}
          >
            回個人頁面
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizHome;
