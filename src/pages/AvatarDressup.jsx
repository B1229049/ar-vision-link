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

          <div className="avatar-dressup-info">
            <h2>修改替身</h2>
            <p>
              每個部位都會保留一個物件。選擇新的物件後按儲存，就會更新到你的個人頁。
            </p>
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
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="avatar-item-grid">
          {activeItems.map((item) => {
            const active = avatarConfig[activeCategory] === item.id;
            const setting = getItemSetting(itemSettings, item.id, "front");

            return (
              <button
                key={item.id}
                className={`avatar-item-card ${active ? "active" : ""}`}
                onClick={() => selectItem(activeCategory, item.id)}
              >
                <span className="avatar-item-thumb">
                  {item.backImg && (
                    <img
                      src={item.backImg}
                      alt=""
                      style={{
                        transform: thumbTransform(setting),
                      }}
                    />
                  )}
                  <img
                    src={item.frontImg}
                    alt={item.label}
                    style={{
                      transform: thumbTransform(setting),
                    }}
                  />
                </span>
                <span>{item.label}</span>
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
