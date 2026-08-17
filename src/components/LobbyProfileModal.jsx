import { useEffect } from "react";
import AvatarRenderer from "./AvatarRenderer";
import ProfileImage from "./ProfileImage";
import "../styles/LobbyProfileModal.css";

function LobbyProfileModal({ user, onClose }) {
  useEffect(() => {
    if (!user) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [user, onClose]);

  if (!user) return null;

  return (
    <div
      className="shared-lobby-profile-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="shared-lobby-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="玩家個人資料"
      >
        <button
          type="button"
          className="shared-lobby-profile-close"
          onClick={onClose}
          aria-label="關閉個人資料"
        >
          X
        </button>

        <div className="shared-lobby-profile-content">
          <div className="shared-lobby-profile-info">
            <ProfileImage user={user} className="shared-lobby-profile-image" />

            <h3>{user.nickname || user.name || "未設定暱稱"}</h3>

            <div className="shared-lobby-profile-bio-panel">
              <h4>自我介紹</h4>
              <p className="shared-lobby-profile-bio">
                {user.description?.trim() || ""}
              </p>
            </div>
          </div>

          <div className="shared-lobby-profile-avatar-wrap">
            <AvatarRenderer
              config={user.avatar_config}
              className="shared-lobby-profile-avatar"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default LobbyProfileModal;
