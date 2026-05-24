import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/HostConsole.css";

function HostConsole() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
    loadConsole();

    timerRef.current = setInterval(loadConsole, 2500);

    return () => clearInterval(timerRef.current);
  }, [sessionId, navigate]);

  const currentIndex = session?.current_question || 0;

  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

  const answeredUserIds = new Set(answers.map((a) => a.user_id));

  const answerStats = ["A", "B", "C", "D"].map((key) => {
    const count = answers.filter((a) => a.answer === key).length;
    const percent =
      players.length > 0 ? Math.round((count / players.length) * 100) : 0;

    return {
      key,
      count,
      percent,
    };
  });

  async function loadConsole() {
    try {
      const sessionRes = await fetch(
        `${BACKEND_URL}/api/game-sessions/${sessionId}`
      );
      const sessionResult = await sessionRes.json();

      if (!sessionRes.ok || sessionResult.error) {
        alert("載入中控台失敗：" + (sessionResult.error || "未知錯誤"));
        navigate("/quiz");
        return;
      }

      setSession(sessionResult.session);
      setQuiz(sessionResult.quiz);
      setQuestions(sessionResult.questions || []);

      const playerRes = await fetch(
        `${BACKEND_URL}/api/player-records/session/${sessionId}`
      );
      const playerResult = await playerRes.json();

      if (playerRes.ok && !playerResult.error) {
        setPlayers(playerResult.players || []);
      }

      const q =
        sessionResult.questions?.[
          sessionResult.session?.current_question || 0
        ];

      if (q) {
        const ansRes = await fetch(
          `${BACKEND_URL}/api/player-answers/session/${sessionId}/question/${q.question_id}`
        );

        const ansResult = await ansRes.json();

        if (ansRes.ok && !ansResult.error) {
          setAnswers(ansResult.answers || []);
        }
      }

      if (sessionResult.session?.game_finished) {
        navigate(`/quiz/leaderboard/${sessionId}`);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  async function nextQuestion() {
    if (!session || changing) return;

    setChanging(true);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      await finishGame();
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${session.session_id}/next`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_question: currentIndex,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("切換下一題失敗：" + (result.error || "未知錯誤"));
        setChanging(false);
        return;
      }

      setAnswers([]);
      await loadConsole();
    } catch (err) {
      console.error(err);
      alert("切換下一題時發生錯誤");
    }

    setChanging(false);
  }

  async function finishGame() {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${session.session_id}/finish`,
        {
          method: "PUT",
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("結束遊戲失敗：" + (result.error || "未知錯誤"));
        setChanging(false);
        return;
      }

      navigate(`/quiz/leaderboard/${session.session_id}`);
    } catch (err) {
      console.error(err);
      alert("結束遊戲時發生錯誤");
    }

    setChanging(false);
  }

  if (loading) {
    return (
      <div className="host-console-page">
        <div className="host-console-card">
          <p>載入主持人中控台...</p>
        </div>
      </div>
    );
  }

  if (currentUser?.id !== quiz?.host_id) {
    return (
      <div className="host-console-page">
        <div className="host-console-card">
          <h2>沒有權限</h2>
          <p>只有主持人可以進入中控台。</p>
          <button
            className="console-btn secondary"
            onClick={() => navigate("/quiz")}
          >
            返回 Quiz Center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="host-console-page">
      <div className="host-console-card">
        <h2>主持人中控台</h2>

        <p className="console-subtitle">{quiz?.title}</p>

        <div className="console-topbar">
          <div>
            <span>房號</span>
            <strong>{session?.room_code}</strong>
          </div>

          <div>
            <span>題目</span>
            <strong>
              {currentIndex + 1} / {questions.length}
            </strong>
          </div>

          <div>
            <span>玩家</span>
            <strong>{players.length}</strong>
          </div>

          <div>
            <span>已作答</span>
            <strong>{answers.length}</strong>
          </div>
        </div>

        {currentQuestion && (
          <>
            <div className="console-question">
              {currentQuestion.question_text}
            </div>

            <div className="console-options">
              {["A", "B", "C", "D"].map((key) => (
                <div
                  key={key}
                  className={
                    key === currentQuestion.correct_answer
                      ? "console-option correct"
                      : "console-option"
                  }
                >
                  <strong>{key}</strong>
                  <span>{currentQuestion.options?.[key]}</span>
                </div>
              ))}
            </div>

            <div className="stats-panel">
              <h3>本題選項統計</h3>

              <div className="stats-list">
                {answerStats.map((item) => (
                  <div className="stat-row" key={item.key}>
                    <div className="stat-label">
                      <strong>{item.key}</strong>
                      <span>{item.count} 人</span>
                    </div>

                    <div className="stat-bar-bg">
                      <div
                        className="stat-bar"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>

                    <div className="stat-percent">{item.percent}%</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="answer-panel">
          <h3>本題作答狀況</h3>

          {players.length === 0 ? (
            <p className="console-hint">目前沒有玩家。</p>
          ) : (
            <div className="answer-list">
              {players.map((record) => {
                const user = record.users;
                const ans = answers.find((a) => a.user_id === record.user_id);

                return (
                  <div className="answer-item" key={record.record_id}>
                    <div className="answer-avatar">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" />
                      ) : (
                        user?.name?.charAt(0) || "U"
                      )}
                    </div>

                    <div className="answer-user">
                      <strong>{user?.name || "未知玩家"}</strong>
                      <span>@{user?.nickname || "unknown"}</span>
                    </div>

                    <div className="answer-status">
                      {answeredUserIds.has(record.user_id) ? (
                        ans?.is_correct ? (
                          <span className="correct-text">
                            答對 +{ans.score}
                          </span>
                        ) : (
                          <span className="wrong-text">答錯 +0</span>
                        )
                      ) : (
                        <span className="wait-text">未作答</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          className="console-btn primary"
          onClick={nextQuestion}
          disabled={changing}
        >
          {changing
            ? "處理中..."
            : currentIndex + 1 >= questions.length
            ? "結束遊戲"
            : "下一題"}
        </button>

        <button
          className="console-btn secondary"
          onClick={() => navigate(`/quiz/leaderboard/${sessionId}`)}
        >
          查看排行榜
        </button>
      </div>
    </div>
  );
}

export default HostConsole;