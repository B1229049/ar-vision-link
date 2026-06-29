import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/QuizHistory.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

function formatDate(value) {
  if (!value) return "尚未結束";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "無";

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOptionText(options, key) {
  if (!options || !key) return "";

  let parsedOptions = options;

  if (typeof options === "string") {
    try {
      parsedOptions = JSON.parse(options);
    } catch {
      return "";
    }
  }

  return parsedOptions[key] || "";
}

function QuizHistory() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("player");

  const [playerSessions, setPlayerSessions] = useState([]);
  const [hostSessions, setHostSessions] = useState([]);

  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [detail, setDetail] = useState(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);

    setCurrentUser(user);
    loadHistory(user.id);
  }, [navigate]);

  async function loadHistory(userId) {
    setLoadingList(true);

    try {
      const [playerRes, hostRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/history/player/${userId}`),
        fetch(`${BACKEND_URL}/api/history/host/${userId}`),
      ]);

      const playerResult = await playerRes.json();
      const hostResult = await hostRes.json();

      if (playerResult.success) {
        setPlayerSessions(playerResult.sessions || []);
      }

      if (hostResult.success) {
        setHostSessions(hostResult.sessions || []);
      }
    } catch (err) {
      console.error(err);
      alert("載入歷史紀錄失敗");
    } finally {
      setLoadingList(false);
    }
  }

  async function openPlayerDetail(session) {
    if (!currentUser) return;

    setSelectedMode("player");
    setSelectedSession(session);
    setDetail(null);
    setLoadingDetail(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/history/player/${currentUser.id}/session/${session.session_id}`
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert("載入玩家紀錄失敗：" + (result.error || "未知錯誤"));
        return;
      }

      setDetail(result);
    } catch (err) {
      console.error(err);
      alert("載入玩家紀錄時發生錯誤");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function openHostDetail(session) {
    if (!currentUser) return;

    setSelectedMode("host");
    setSelectedSession(session);
    setDetail(null);
    setLoadingDetail(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/history/host/${currentUser.id}/session/${session.session_id}`
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert("載入主持紀錄失敗：" + (result.error || "未知錯誤"));
        return;
      }

      setDetail(result);
    } catch (err) {
      console.error(err);
      alert("載入主持紀錄時發生錯誤");
    } finally {
      setLoadingDetail(false);
    }
  }

  const activeSessions = useMemo(() => {
    return tab === "player" ? playerSessions : hostSessions;
  }, [tab, playerSessions, hostSessions]);

  if (!currentUser) {
    return (
      <div className="quiz-history-page">
        <div className="history-container">
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-history-page">
      <div className="history-container">
        <header className="history-header">
          <div>
            <span className="history-badge">Quiz History</span>
            <h1>測驗歷史紀錄</h1>
            <p>
              查看自己參加過的測驗成績，也可以查看自己主持過的場次與玩家答題紀錄。
            </p>
          </div>

          <button className="history-btn ghost" onClick={() => navigate("/quiz")}>
            返回 Quiz Center
          </button>
        </header>

        <div className="history-tabs">
          <button
            className={tab === "player" ? "active" : ""}
            onClick={() => {
              setTab("player");
              setSelectedMode(null);
              setSelectedSession(null);
              setDetail(null);
            }}
          >
            我的參加紀錄
          </button>

          <button
            className={tab === "host" ? "active" : ""}
            onClick={() => {
              setTab("host");
              setSelectedMode(null);
              setSelectedSession(null);
              setDetail(null);
            }}
          >
            我主持的紀錄
          </button>
        </div>

        <div className="history-layout">
          <aside className="history-sidebar">
            <h2>{tab === "player" ? "參加場次" : "主持場次"}</h2>

            {loadingList ? (
              <p className="history-empty">載入中...</p>
            ) : activeSessions.length === 0 ? (
              <p className="history-empty">
                {tab === "player"
                  ? "目前沒有參加紀錄。"
                  : "目前沒有主持紀錄。"}
              </p>
            ) : (
              <div className="history-session-list">
                {activeSessions.map((session) => (
                  <button
                    key={session.session_id}
                    className={
                      selectedSession?.session_id === session.session_id
                        ? "history-session-card active"
                        : "history-session-card"
                    }
                    onClick={() =>
                      tab === "player"
                        ? openPlayerDetail(session)
                        : openHostDetail(session)
                    }
                  >
                    <strong>{session.quiz_title || "未命名測驗"}</strong>
                    <span>房號：{session.room_code}</span>
                    <span>場次 ID：{session.session_id}</span>
                    <span>
                      {tab === "player"
                        ? `分數：${session.score ?? 0}`
                        : `玩家人數：${session.player_count ?? 0}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main className="history-detail">
            {!selectedSession ? (
              <div className="history-detail-empty">
                <h2>請選擇左側場次</h2>
                <p>選擇後即可查看排行榜、分數與答題紀錄。</p>
              </div>
            ) : loadingDetail ? (
              <div className="history-detail-empty">
                <h2>載入明細中...</h2>
              </div>
            ) : !detail ? (
              <div className="history-detail-empty">
                <h2>尚無明細資料</h2>
              </div>
            ) : selectedMode === "player" ? (
              <PlayerDetail detail={detail} />
            ) : (
              <HostDetail detail={detail} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function PlayerDetail({ detail }) {
  const answers = detail.answers || [];
  const record = detail.record || {};
  const quiz = detail.quiz || {};
  const session = detail.session || {};

  return (
    <div>
      <section className="history-summary">
        <div>
          <span>測驗名稱</span>
          <strong>{quiz.title || "未命名測驗"}</strong>
        </div>

        <div>
          <span>房號</span>
          <strong>{session.room_code}</strong>
        </div>

        <div>
          <span>總分</span>
          <strong>{record.score ?? 0}</strong>
        </div>

        <div>
          <span>排名</span>
          <strong>
            {record.rank ? `${record.rank} / ${record.player_count}` : "無"}
          </strong>
        </div>
      </section>

      <section className="answer-section">
        <h2>我的答題紀錄</h2>

        {answers.length === 0 ? (
          <p className="history-empty">尚無答題紀錄。</p>
        ) : (
          <div className="answer-table">
            {answers.map((item, index) => {
              const q = item.questions || {};
              const myAnswerText = getOptionText(q.options, item.answer);
              const correctText = getOptionText(q.options, q.correct_answer);

              return (
                <div className="answer-row" key={item.answer_id || index}>
                  <div className="answer-question">
                    <strong>第 {index + 1} 題</strong>
                    <p>{q.question_text || "題目不存在"}</p>
                  </div>

                  <div className="answer-meta">
                    <span>
                      我的答案：{item.answer || "未答"}
                      {myAnswerText ? `．${myAnswerText}` : ""}
                    </span>

                    <span>
                      正確答案：{q.correct_answer || "無"}
                      {correctText ? `．${correctText}` : ""}
                    </span>

                    <span>得分：{item.score ?? 0}</span>

                    <strong
                      className={item.is_correct ? "correct-text" : "wrong-text"}
                    >
                      {item.is_correct ? "答對" : "答錯"}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function HostDetail({ detail }) {
  const leaderboard = detail.leaderboard || [];
  const answers = detail.answers || [];
  const quiz = detail.quiz || {};
  const session = detail.session || {};

  return (
    <div>
      <section className="history-summary">
        <div>
          <span>測驗名稱</span>
          <strong>{quiz.title || "未命名測驗"}</strong>
        </div>

        <div>
          <span>房號</span>
          <strong>{session.room_code}</strong>
        </div>

        <div>
          <span>開始時間</span>
          <strong>{formatDate(session.started_at)}</strong>
        </div>

        <div>
          <span>結束時間</span>
          <strong>{formatDate(session.ended_at)}</strong>
        </div>
      </section>

      <section className="leaderboard-section">
        <h2>排行榜</h2>

        {leaderboard.length === 0 ? (
          <p className="history-empty">目前沒有玩家紀錄。</p>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((item, index) => (
              <div className="leaderboard-row" key={item.record_id}>
                <div className="rank">#{index + 1}</div>

                <div className="player-info">
                  <strong>{item.users?.name || "未命名玩家"}</strong>
                  <span>@{item.users?.nickname || "unknown"}</span>
                </div>

                <div className="score">{item.score ?? 0} 分</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="answer-section">
        <h2>所有玩家答題紀錄</h2>

        {answers.length === 0 ? (
          <p className="history-empty">尚無答題資料。</p>
        ) : (
          <div className="answer-table">
            {answers.map((item, index) => {
              const q = item.questions || {};
              const playerAnswerText = getOptionText(q.options, item.answer);

              return (
                <div className="answer-row" key={item.answer_id || index}>
                  <div className="answer-question">
                    <strong>
                      {item.users?.name || "未命名玩家"}｜第{" "}
                      {item.question_id} 題
                    </strong>

                    <p>{q.question_text || "題目不存在"}</p>
                  </div>

                  <div className="answer-meta">
                    <span>
                      作答：{item.answer || "未答"}
                      {playerAnswerText ? `．${playerAnswerText}` : ""}
                    </span>

                    <span>正解：{q.correct_answer || "無"}</span>

                    <span>得分：{item.score ?? 0}</span>

                    <strong
                      className={item.is_correct ? "correct-text" : "wrong-text"}
                    >
                      {item.is_correct ? "答對" : "答錯"}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default QuizHistory;