import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HostLobby.css";

function HostLobby() {
  const navigate = useNavigate();

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

    setCreating(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/game-sessions/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quiz_id: Number(selectedQuizId),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("建立房間失敗：" + (result.error || "未知錯誤"));
        setCreating(false);
        return;
      }

      setSession(result.session);
      localStorage.setItem("hostGameSession", JSON.stringify(result.session));
    } catch (err) {
      console.error(err);
      alert("建立房間時發生錯誤");
    }

    setCreating(false);
  }

  function copyRoomCode() {
    if (!session?.room_code) return;

    navigator.clipboard.writeText(session.room_code);
    alert("房號已複製！");
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
          選擇你建立的測驗，產生房號讓玩家加入。
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
          <div className="room-box">
            <p className="room-label">房號 Room Code</p>

            <div className="room-code">{session.room_code}</div>

            <p className="room-hint">
              請玩家到「加入測驗」輸入這組房號。
            </p>

            <button className="host-btn secondary" onClick={copyRoomCode}>
              複製房號
            </button>

            <button
              className="host-btn primary"
              onClick={() => navigate(`/quiz/lobby/${session.session_id}`)}
            >
              進入等待室
            </button>
          </div>
        )}

        <button className="host-btn ghost" onClick={() => navigate("/quiz")}>
          返回 Quiz Center
        </button>
      </div>
    </div>
  );
}

export default HostLobby;