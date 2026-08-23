import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarRenderer from "../components/AvatarRenderer";
import ProfileImage from "../components/ProfileImage";
import "../styles/Profile.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

function Profile() {
  const navigate = useNavigate();
  const [currentUser] = useState(getStoredUser);

  useEffect(() => {
    if (!currentUser) {
      navigate("/face-login");
    }
  }, [currentUser, navigate]);

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
            <ProfileImage user={currentUser} className="avatar-circle" />

            <h2 className="profile-name">{currentUser.name || "未命名使用者"}</h2>
          </div>

          <div className="profile-avatar-stage">
            <AvatarRenderer
              config={currentUser.avatar_config}
              className="profile-avatar-renderer"
            />
          </div>
        </div>

        <section className="profile-bio-section">
          <div className="profile-section-heading">
            <h3>自我介紹</h3>
          </div>
          <p>{currentUser.description?.trim() || ""}</p>
        </section>

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
            編輯 虛擬替身
          </button>

        </div>

        <button
          className="profile-btn primary"
          onClick={() => navigate("/edit-profile")}
        >
          編輯資料
        </button>

        <button className="profile-btn danger" onClick={logout}>
          登出
        </button>
      </div>
    </div>
  );
}

export default Profile;
