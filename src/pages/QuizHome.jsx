import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuizColor, getQuizInitial } from "../utils/quizVisuals";
import "../styles/QuizHome.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

function DashboardIcon({ name }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "overview") {
    return <svg {...shared}><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" /></svg>;
  }
  if (name === "quizzes") {
    return <svg {...shared}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
  }
  if (name === "history") {
    return <svg {...shared}><path d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg>;
  }
  if (name === "host") {
    return <svg {...shared}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  }
  if (name === "join") {
    return <svg {...shared}><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" /></svg>;
  }
  return <svg {...shared}><path d="M12 5v14M5 12h14" /></svg>;
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    localStorage.removeItem("currentUser");
    return null;
  }
}

function QuizHome() {
  const navigate = useNavigate();
  const [currentUser] = useState(getStoredUser);
  const [quizzes, setQuizzes] = useState([]);
  const [hostSessionCount, setHostSessionCount] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate("/face-login");
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoadingDashboard(true);
      try {
        const [quizResponse, historyResponse] = await Promise.allSettled([
          fetch(`${BACKEND_URL}/api/quizzes/host/${currentUser.id}`),
          fetch(`${BACKEND_URL}/api/history/host/${currentUser.id}`),
        ]);

        if (quizResponse.status === "fulfilled" && quizResponse.value.ok) {
          const quizResult = await quizResponse.value.json();
        const quizList = [...(quizResult.quizzes || [])].sort((first, second) => {
          const firstTime = Date.parse(first.updated_at || first.created_at || "") || 0;
          const secondTime = Date.parse(second.updated_at || second.created_at || "") || 0;

          if (firstTime !== secondTime) return secondTime - firstTime;
          return Number(second.quiz_id || 0) - Number(first.quiz_id || 0);
        });
          const detailedRecentQuizzes = await Promise.all(
            quizList.slice(0, 3).map(async (quiz) => {
              try {
                const response = await fetch(`${BACKEND_URL}/api/quizzes/${quiz.quiz_id}`);
                const result = await response.json();
                if (!response.ok || result.error) return quiz;
                return { ...quiz, question_count: (result.questions || []).length };
              } catch {
                return quiz;
              }
            })
          );
          const recentQuizMap = new Map(
            detailedRecentQuizzes.map((quiz) => [quiz.quiz_id, quiz])
          );
          if (!cancelled) {
            setQuizzes(quizList.map((quiz) => recentQuizMap.get(quiz.quiz_id) || quiz));
          }
        } else if (!cancelled) {
          setQuizzes([]);
        }

        if (historyResponse.status === "fulfilled" && historyResponse.value.ok) {
          const historyResult = await historyResponse.value.json();
          if (!cancelled) {
            setHostSessionCount(
              historyResult.success ? (historyResult.sessions || []).length : 0
            );
          }
        } else if (!cancelled) {
          setHostSessionCount(0);
        }
      } catch (error) {
        console.error("載入 Quiz Center 資料失敗：", error);
        if (!cancelled) {
          setQuizzes([]);
          setHostSessionCount(0);
        }
      } finally {
        if (!cancelled) setLoadingDashboard(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [currentUser, navigate]);

  function handleQuickJoin(event) {
    event.preventDefault();
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    if (!normalizedRoomCode) {
      window.alert("請先輸入房號");
      return;
    }
    navigate(`/quiz/join?room=${encodeURIComponent(normalizedRoomCode)}`);
  }

  if (!currentUser) {
    return <div className="quiz-home-page quiz-home-loading"><p>載入中...</p></div>;
  }

  const recentQuizzes = quizzes.slice(0, 3);

  return (
    <div className="quiz-home-page">
      <main className="quiz-dashboard-main">
          <section className="quiz-dashboard-primary-grid" aria-label="建立或加入測驗">
            <article className="quiz-create-panel">
              <h1>出題目</h1>
              <p>貼上文字或上傳 PDF、TXT，讓 AI 產生題目；也可以直接建立並自由編輯。</p>
              <div className="quiz-create-actions">
                <button type="button" className="quiz-create-ai" onClick={() => navigate("/quiz/create")}>建立測驗</button>
              </div>
            </article>

            <article className="quiz-join-panel">
              <div><h2>快速加入</h2><p>輸入主持人提供的房號，立即進入測驗。</p></div>
              <form className="quiz-join-form" onSubmit={handleQuickJoin}>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="輸入房號"
                  aria-label="房號"
                  maxLength={12}
                />
                <button type="submit">加入</button>
              </form>
            </article>
          </section>

          <section className="quiz-mobile-actions" aria-label="Quiz Center 快速操作">
            <button type="button" onClick={() => navigate("/quiz/host")}><DashboardIcon name="host" /><strong>建立房間</strong></button>
            <button type="button" onClick={() => navigate("/quiz/manage")}><DashboardIcon name="quizzes" /><strong>我的測驗</strong></button>
            <button type="button" onClick={() => navigate("/quiz/join")}><DashboardIcon name="add" /><strong>加入測驗</strong></button>
            <button type="button" onClick={() => navigate("/quiz/history")}><DashboardIcon name="history" /><strong>歷史紀錄</strong></button>
          </section>

          <section className="quiz-dashboard-stats" aria-label="Quiz Center 統計">
            <article>
              <div><span>我的測驗</span><i className="quiz-stat-dot purple" aria-hidden="true" /></div>
              <strong>{loadingDashboard ? "—" : quizzes.length}</strong>
            </article>
            <article>
              <div><span>主持場次</span><i className="quiz-stat-dot cyan" aria-hidden="true" /></div>
              <strong>{loadingDashboard ? "—" : hostSessionCount ?? 0}</strong>
            </article>
          </section>

          <section className="quiz-recent-section">
            <div className="quiz-recent-heading">
              <h2>最近編輯</h2>
              <button type="button" onClick={() => navigate("/quiz/manage")}>查看全部 →</button>
            </div>

            {loadingDashboard ? (
              <div className="quiz-dashboard-message">正在載入測驗...</div>
            ) : recentQuizzes.length === 0 ? (
              <div className="quiz-dashboard-message">
                <strong>目前還沒有測驗</strong>
                <span>建立第一份測驗後，會顯示在這裡。</span>
                <button type="button" onClick={() => navigate("/quiz/create")}>建立測驗</button>
              </div>
            ) : (
              <div className="quiz-recent-list">
                {recentQuizzes.map((quiz) => (
                  <article className="quiz-recent-item" key={quiz.quiz_id}>
                    <div
                      className="quiz-recent-initial"
                      style={{ backgroundColor: getQuizColor(quiz.title, quiz.quiz_id) }}
                      aria-hidden="true"
                    >
                      {getQuizInitial(quiz.title)}
                    </div>
                    <div className="quiz-recent-info">
                      <strong>{quiz.title || "未命名測驗"}</strong>
                      {Number.isInteger(quiz.question_count) && <span>{quiz.question_count} 題</span>}
                    </div>
                    <div className="quiz-recent-actions">
                      <button type="button" onClick={() => navigate("/quiz/manage")}>編輯題目</button>
                      <button type="button" onClick={() => navigate("/quiz/host")}>建立房間</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
      </main>
    </div>
  );
}

export default QuizHome;
