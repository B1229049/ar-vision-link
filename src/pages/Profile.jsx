import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarRenderer from "../components/AvatarRenderer";
import "../styles/Profile.css";

function Profile() {
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

  function logout() {
    localStorage.removeItem("currentUser");
    navigate("/");
  }

  function formatDate(dateString) {
    if (!dateString) return "無";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "無";

    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!currentUser) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-hero">
          <div className="profile-identity">
            <div className="avatar-circle">
              {currentUser.profile_url ? (
                <img
                  src={currentUser.profile_url}
                  alt="profile"
                  className="profile-avatar-img"
                />
              ) : (
                currentUser.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>

            <h2 className="profile-name">{currentUser.name || "未命名使用者"}</h2>

            <p className="profile-nickname">
              @{currentUser.nickname || "unknown"}
            </p>

            {currentUser.description?.trim() && (
              <p className="profile-bio">{currentUser.description}</p>
            )}
          </div>

          <div className="profile-avatar-stage">
            <div className="profile-avatar-glow" />
            <AvatarRenderer
              config={currentUser.avatar_config}
              className="profile-avatar-renderer"
            />
          </div>
        </div>

        <div className="profile-media-section">
          <div className="profile-section-heading">
            <h3>動態牆</h3>
          </div>

          <div className="profile-media-grid empty">
            {Array.from({ length: 9 }).map((_, index) => (
              <div className="profile-media-tile" key={index} />
            ))}
          </div>
        </div>

        <div className="profile-info-list">
          <div className="info-row">
            <span>使用者 ID</span>
            <strong>{currentUser.id}</strong>
          </div>

          <div className="info-row">
            <span>建立時間</span>
            <strong>{formatDate(currentUser.created_at)}</strong>
          </div>

          <div className="info-row">
            <span>更新時間</span>
            <strong>{formatDate(currentUser.updated_at)}</strong>
          </div>
        </div>

        <div className="profile-action-grid">
          <button
            className="profile-btn primary"
            onClick={() => navigate("/quiz")}
          >
            Quiz Center
          </button>

          <button
            className="profile-btn secondary"
            onClick={() => navigate("/quiz/history")}
          >
            歷史紀錄
          </button>

          <button
            className="profile-btn secondary"
            onClick={() => navigate("/re-register-face")}
          >
            重新註冊臉部
          </button>

          <button
            className="profile-btn secondary"
            onClick={() => navigate("/avatar-dressup")}
          >
            修改虛擬替身
          </button>
        </div>

        <button
          className="profile-btn secondary"
          onClick={() => navigate("/edit-profile")}
        >
          編輯資料
        </button>

        <button
          className="profile-btn ghost"
          onClick={() => navigate("/")}
        >
          回首頁
        </button>

        <button className="profile-btn danger" onClick={logout}>
          登出
        </button>
      </div>
    </div>
  );
}

export default Profile;
