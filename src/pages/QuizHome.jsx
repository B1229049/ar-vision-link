import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/QuizHome.css";

function QuizHome() {
  const navigate = useNavigate();
  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

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

  async function loadMyQuizzes(userId) {
    setLoadingQuizzes(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/quizzes/host/${userId}`);
      const result = await response.json();

      if (!response.ok || result.error) {
        alert("載入測驗失敗：" + (result.error || "未知錯誤"));
        setLoadingQuizzes(false);
        return;
      }

      setQuizzes(result.quizzes || []);
    } catch (err) {
      console.error(err);
      alert("載入測驗時發生錯誤");
    }

    setLoadingQuizzes(false);
  }

  async function deleteQuiz(quiz) {
    if (!currentUser) {
      alert("請先登入");
      return;
    }

    if (Number(quiz.host_id) !== Number(currentUser.id)) {
      alert("你不能刪除別人的測驗");
      return;
    }

    const ok = window.confirm(`確定要刪除「${quiz.title}」嗎？`);
    if (!ok) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/quizzes/${quiz.quiz_id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host_id: currentUser.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("刪除失敗：" + (result.error || "未知錯誤"));
        return;
      }

      setQuizzes((prev) =>
        prev.filter((q) => q.quiz_id !== quiz.quiz_id)
      );

      alert("測驗已刪除");
    } catch (err) {
      console.error(err);
      alert("刪除測驗時發生錯誤");
    }
  }

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
          {currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt="avatar" />
          ) : (
            currentUser.name?.charAt(0) || "U"
          )}
        </div>

        <h2>Quiz Center</h2>

        <p className="quiz-subtitle">
          歡迎回來，{currentUser.name}！你可以建立新的測驗，或加入別人的遊戲。
        </p>

        <div className="quiz-actions">
          <button className="quiz-btn primary" onClick={() => navigate("/quiz/host")}>
            主持遊戲
          </button>

          <button className="quiz-btn primary" onClick={() => navigate("/quiz/create")}>
            建立測驗
          </button>

          <button className="quiz-btn secondary" onClick={() => navigate("/quiz/manage")}>
            編輯 Quiz
          </button>

          <button className="quiz-btn secondary" onClick={() => navigate("/quiz/join")}>
            加入測驗
          </button>

          <button className="quiz-btn ghost" onClick={() => navigate("/profile")}>
            回個人頁面
          </button>
        </div>

        <div className="my-quiz-section">
          <h3>我已建立的測驗</h3>

          {loadingQuizzes ? (
            <p className="quiz-empty-text">載入測驗中...</p>
          ) : quizzes.length === 0 ? (
            <p className="quiz-empty-text">你目前還沒有建立任何測驗。</p>
          ) : (
            <div className="my-quiz-list">
              {quizzes.map((quiz) => (
                <div className="my-quiz-item" key={quiz.quiz_id}>
                  <div>
                    <strong>{quiz.title}</strong>
                    <p>Quiz ID：{quiz.quiz_id}</p>
                  </div>

                  <button
                    className="delete-quiz-btn"
                    onClick={() => deleteQuiz(quiz)}
                  >
                    刪除測驗
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizHome;