import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarRenderer from "../components/AvatarRenderer";
import ProfileImage from "../components/ProfileImage";
import "../styles/Profile.css";

const BACKEND_URL = "https://ar-vision-link.onrender.com";

function Profile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selfies, setSelfies] = useState([]);
  const [openedSelfieUrl, setOpenedSelfieUrl] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
  }, [navigate]);

  useEffect(() => {
    if (!currentUser?.id) return;

    async function loadSelfies() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/users/${currentUser.id}/ar-selfies`);
        const result = await response.json();
        if (response.ok && result.success) setSelfies(result.photos || []);
      } catch (error) {
        console.error("AR 自拍載入失敗", error);
      }
    }

    loadSelfies();
  }, [currentUser?.id]);

  function logout() {
    localStorage.removeItem("currentUser");
    navigate("/");
  }

  async function deleteSelfie(selfieId) {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/users/${currentUser.id}/ar-selfies/${selfieId}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "照片刪除失敗");
      setSelfies((previous) => previous.filter((selfie) => selfie.id !== selfieId));
    } catch (error) {
      alert(error.message || "照片刪除失敗");
    }
  }

  async function openSelfie(selfieId) {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/users/${currentUser.id}/ar-selfies/${selfieId}/image`
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "照片載入失敗");
      setOpenedSelfieUrl(result.url);
    } catch (error) {
      alert(error.message || "照片載入失敗");
    }
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

            <p className="profile-nickname">
              @{currentUser.nickname || "unknown"}
            </p>

          </div>

          <div className="profile-avatar-stage">
            <div className="profile-avatar-glow" />
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
          <p>{currentUser.description?.trim() || "尚未填寫自我介紹"}</p>
        </section>

        <div className="profile-media-section">
          <div className="profile-section-heading">
            <h3>動態牆</h3>
          </div>

          <div className="profile-media-grid">
            {Array.from({ length: 2 }).map((_, index) => (
              <div className="profile-media-tile" key={index}>
                {selfies[index] && (
                  <>
                    <button
                      type="button"
                      className="profile-media-open"
                      onClick={() => openSelfie(selfies[index].id)}
                      aria-label={`查看 AR 自拍 ${index + 1}`}
                    >
                      <img src={selfies[index].thumbnail_url} alt={`AR 自拍縮圖 ${index + 1}`} />
                    </button>
                    <button
                      type="button"
                      className="profile-media-delete"
                      onClick={() => deleteSelfie(selfies[index].id)}
                      aria-label={`刪除 AR 自拍 ${index + 1}`}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {openedSelfieUrl && (
          <div className="profile-selfie-dialog" role="dialog" aria-modal="true" aria-label="AR 自拍照">
            <button type="button" className="profile-selfie-backdrop" onClick={() => setOpenedSelfieUrl(null)} aria-label="關閉照片" />
            <div className="profile-selfie-preview">
              <img src={openedSelfieUrl} alt="AR 自拍照" />
              <button type="button" onClick={() => setOpenedSelfieUrl(null)}>關閉</button>
            </div>
          </div>
        )}

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

          <button
            className="profile-btn secondary"
            onClick={() => navigate("/ar-selfie")}
          >
            AR 濾鏡自拍
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
