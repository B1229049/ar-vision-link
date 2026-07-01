import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarRenderer from "../components/AvatarRenderer";
import {
  AVATAR_CATEGORIES,
  AVATAR_ITEMS,
  getItemSetting,
  normalizeAvatarConfig,
} from "../utils/avatarConfig";
import "../styles/AvatarDressup.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

function thumbTransform(setting) {
  const scale = Number(setting.thumb_scale) || 1;

  if (setting.thumb_x_pct !== undefined || setting.thumb_y_pct !== undefined) {
    return `translate(${Number(setting.thumb_x_pct) || 0}%, ${
      Number(setting.thumb_y_pct) || 0
    }%) scale(${scale})`;
  }

  return `translate(${Number(setting.thumb_x) || 0}px, ${
    Number(setting.thumb_y) || 0
  }px) scale(${scale})`;
}

function CategoryIcon({ type }) {
  if (type === "face") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 10h.01M15.5 10h.01M8.5 15c1.9 1.8 5.1 1.8 7 0" />
      </svg>
    );
  }

  if (type === "top") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4 4.5 6.2 3 11l3 1.2V20h12v-7.8l3-1.2-1.5-4.8L16 4l-4 2.2L8 4Z" />
        <path d="M9 4c.6 1.4 1.6 2.1 3 2.1S14.4 5.4 15 4" />
      </svg>
    );
  }

  if (type === "bottoms") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10l.8 16H14l-2-9.2L10 20H6.2L7 4Z" />
        <path d="M12 4v6.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 14.5C4 8 7.5 4 12.2 4 17 4 20 7.8 20 13.8c0 3.2-1.2 5.8-3 7.2.4-2.6-.2-4.8-1.6-6.4-.7 2.1-2.1 4.1-4.3 5.4.5-2.4.2-4.7-.8-6.4-1.3 2.1-3.2 3.5-5.3 4.1.6-1.1 1-2.2 1-3.2H4Z" />
    </svg>
  );
}

function AvatarDressup() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState("hair");
  const [avatarConfig, setAvatarConfig] = useState(normalizeAvatarConfig());
  const [itemSettings, setItemSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);
    setAvatarConfig(normalizeAvatarConfig(user.avatar_config));
    loadItemSettings();
  }, [navigate]);

  async function loadItemSettings() {
    // The backend might have old absolute pixel values (x, y) instead of x_pct, y_pct.
    // Since we use avatarItemSettings.js as the source of truth, we ignore the backend here.
    setItemSettings({});
  }

  function selectItem(category, itemId) {
    setAvatarConfig((prev) => ({
      ...prev,
      [category]: itemId,
    }));
  }

  async function saveAvatar() {
    if (!currentUser) return;

    const finalConfig = normalizeAvatarConfig(avatarConfig);
    setSaving(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/users/${currentUser.id}/avatar`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar_config: finalConfig,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert("儲存替身失敗：" + (result.error || "未知錯誤"));
        return;
      }

      const updatedUser = {
        ...currentUser,
        avatar_config: result.avatar_config,
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setAvatarConfig(normalizeAvatarConfig(result.avatar_config));

      alert("替身已更新！");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      alert("儲存替身時發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser) {
    return (
      <div className="avatar-dressup-page">
        <div className="avatar-dressup-card">
          <p>載入替身資料中...</p>
        </div>
      </div>
    );
  }

  const activeItems = AVATAR_ITEMS[activeCategory] || [];

  return (
    <div className="avatar-dressup-page">
      <div className="avatar-dressup-card">
        <div className="avatar-dressup-preview">
          <div className="avatar-dressup-stage">
            <AvatarRenderer
              config={avatarConfig}
              itemSettings={itemSettings}
              className="avatar-dressup-renderer"
            />
          </div>
        </div>

        <div className="avatar-tabs">
          {AVATAR_CATEGORIES.map((category) => (
            <button
              key={category.key}
              className={`avatar-tab ${
                activeCategory === category.key ? "active" : ""
              }`}
              onClick={() => setActiveCategory(category.key)}
              aria-label={category.label}
              title={category.label}
            >
              <CategoryIcon type={category.key} />
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        <div className="avatar-item-grid">
          {activeItems.map((item) => {
            const active = avatarConfig[activeCategory] === item.id;
            const frontSetting = getItemSetting(itemSettings, item.id, "front");
            const backSetting = getItemSetting(itemSettings, item.id, "back");

            return (
              <button
                key={item.id}
                className={`avatar-item-card ${active ? "active" : ""}`}
                onClick={() => selectItem(activeCategory, item.id)}
                aria-label={item.label}
                title={item.label}
              >
                <span className="avatar-item-thumb">
                  {item.backImg && (
                    <img
                      src={item.backImg}
                      alt=""
                      style={{
                        transform: thumbTransform(backSetting),
                      }}
                    />
                  )}
                  <img
                    src={item.frontImg}
                    alt=""
                    style={{
                      transform: thumbTransform(frontSetting),
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="avatar-dressup-actions">
          <button
            className="avatar-dressup-btn primary"
            onClick={saveAvatar}
            disabled={saving}
          >
            {saving ? "儲存中..." : "儲存替身"}
          </button>

          <button
            className="avatar-dressup-btn secondary"
            onClick={() => navigate("/profile")}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarDressup;
