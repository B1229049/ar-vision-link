import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarRenderer from "../components/AvatarRenderer";
import "../styles/Leaderboard.css";

function Leaderboard() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
    loadLeaderboard();

    const timer = setInterval(loadLeaderboard, 3000);

    return () => clearInterval(timer);
  }, [sessionId, navigate]);

  async function loadLeaderboard() {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/leaderboard/${sessionId}`
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("載入排行榜失敗：" + (result.error || "未知錯誤"));
        navigate("/quiz");
        return;
      }

      setLeaderboard(result.leaderboard || []);
    } catch (err) {
      console.error(err);
      alert("載入排行榜時發生錯誤");
    }

    setLoading(false);
  }

  const myRank = useMemo(() => {
    if (!currentUser) return null;

    const index = leaderboard.findIndex(
      (record) => record.user_id === currentUser.id
    );

    return index >= 0 ? index + 1 : null;
  }, [leaderboard, currentUser]);

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="leaderboard-card">
          <p>載入排行榜中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-card">
        <h2>排行榜</h2>

        <p className="leaderboard-subtitle">
          遊戲結束！看看誰拿到最高分。
        </p>

        {myRank && (
          <div className="my-rank-box">
            <span>你的名次</span>
            <strong>第 {myRank} 名</strong>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="empty-leaderboard">
            目前還沒有玩家分數。
          </div>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((record, index) => {
              const user = record.users;
              const rank = index + 1;

              return (
                <div
                  key={record.record_id}
                  className={`leaderboard-item ${
                    record.user_id === currentUser?.id ? "me" : ""
                  } ${rank === 1 ? "first" : ""}`}
                >
                  <div className="rank-number">
                    {rank === 1 ? "🏆" : rank}
                  </div>

                  <div className="leader-avatar">
                    <AvatarRenderer
                      config={user?.avatar_config}
                      className="leader-avatar-renderer"
                    />
                  </div>

                  <div className="leader-info">
                    <strong>{user?.name || "未知玩家"}</strong>
                  </div>

                  <div className="leader-score">
                    {record.score || 0}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          className="leaderboard-btn secondary"
          onClick={() => navigate("/quiz")}
        >
          返回 Quiz Center
        </button>
      </div>
    </div>
  );
}

export default Leaderboard;
