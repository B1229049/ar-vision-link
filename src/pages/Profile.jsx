import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    setCurrentUser(null);
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
          <p>載入個人資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="avatar-circle">
          {currentUser.name?.charAt(0) || "U"}
        </div>

        <h2>{currentUser.name || "未命名使用者"}</h2>

        <p className="profile-nickname">
          @{currentUser.nickname || "unknown"}
        </p>

        <div className="profile-section">
          <h3>自我介紹</h3>
          <p>{currentUser.description || "尚無介紹"}</p>
        </div>

        <div className="profile-section">
          <h3>額外資訊</h3>
          <p>{currentUser.extra_info || "無額外資訊"}</p>
        </div>

        <div className="profile-info-list">
          <div className="info-row">
            <span>ID</span>
            <strong>{currentUser.id}</strong>
          </div>

          <div className="info-row">
            <span>帳號狀態</span>
            <strong>{currentUser.is_active === false ? "停用" : "啟用"}</strong>
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

        <button className="profile-btn primary" onClick={() => navigate("/edit-profile")}>
          編輯個人資料
        </button>

        <button className="profile-btn primary" onClick={() => navigate("/camera")}>
          進入 AR Camera
        </button>

        <button className="profile-btn secondary" onClick={() => navigate("/")}>
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