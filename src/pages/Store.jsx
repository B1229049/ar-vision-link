import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarRenderer from "../components/AvatarRenderer";
import { STORE_CATALOG } from "../data/storeCatalog";
import { normalizeAvatarConfig } from "../utils/avatarConfig";
import "../styles/Store.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

function OutfitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4 4.5 6.2 3 11l3 1.2V20h12v-7.8l3-1.2-1.5-4.8L16 4l-4 2.2L8 4Z" />
      <path d="M9 4c.6 1.4 1.6 2.1 3 2.1S14.4 5.4 15 4" />
    </svg>
  );
}

function Store() {
  const navigate = useNavigate();
  const savedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  }, []);

  const [currentUser, setCurrentUser] = useState(savedUser);
  const [selectedId, setSelectedId] = useState(STORE_CATALOG[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedOutfit =
    STORE_CATALOG.find((outfit) => outfit.id === selectedId) ||
    STORE_CATALOG[0] ||
    null;

  const isEquipped = Boolean(
    selectedOutfit &&
      ["hair", "face", "top", "bottoms"].every(
        (category) =>
          currentUser?.avatar_config?.[category] ===
          selectedOutfit.config[category]
      )
  );

  async function equipSelectedOutfit() {
    if (!currentUser || !selectedOutfit || saving) return;

    setSaving(true);
    setNotice("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/users/${currentUser.id}/avatar`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_config: selectedOutfit.config }),
        }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "套裝穿戴失敗");
      }

      const updatedUser = {
        ...currentUser,
        avatar_config: normalizeAvatarConfig(result.avatar_config),
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setNotice(`已穿戴「${selectedOutfit.name}」`);
    } catch (error) {
      console.error(error);
      setNotice(error.message || "穿戴套裝時發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="store-page">
      <header className="store-header">
        <h1>商城</h1>
      </header>

      {!selectedOutfit ? (
        <section className="store-empty">
          <OutfitIcon />
          <h2>目前尚未上架任何套裝</h2>
        </section>
      ) : (
      <div className="store-layout">
        <section
          className="store-preview-panel"
          style={{ "--outfit-accent": selectedOutfit.accent }}
        >
          <div className="store-preview-copy">
            {selectedOutfit.tagline && <span>{selectedOutfit.tagline}</span>}
            <h2>{selectedOutfit.name}</h2>
            {selectedOutfit.description && <p>{selectedOutfit.description}</p>}
          </div>

          <div className="store-avatar-stage">
            <div className="store-stage-glow" />
            <AvatarRenderer
              config={selectedOutfit.config}
              itemSettings={selectedOutfit.settings}
              className="store-avatar-renderer"
            />
            <div className="store-stage-platform" />
          </div>

          <div className="store-piece-list" aria-label="套裝內容">
            <span>頭部</span>
            <span>臉部</span>
            <span>上半身</span>
            <span>下半身</span>
          </div>

          <button
            type="button"
            className="store-equip-button"
            onClick={equipSelectedOutfit}
            disabled={saving || isEquipped}
          >
            {saving ? "穿戴中..." : isEquipped ? "目前穿戴中" : "直接穿戴此套裝"}
          </button>

          {notice && <div className="store-notice" role="status">{notice}</div>}
        </section>

        <section className="store-catalog-panel">
          <div className="store-catalog-heading">
            <div>
              <span>COLLECTION</span>
              <h2>選擇套裝</h2>
            </div>
            <strong>{STORE_CATALOG.length} SETS</strong>
          </div>

          <div className="store-outfit-grid">
            {STORE_CATALOG.map((outfit) => {
              const active = outfit.id === selectedOutfit.id;

              return (
                <button
                  type="button"
                  key={outfit.id}
                  className={`store-outfit-card ${active ? "active" : ""}`}
                  style={{ "--outfit-accent": outfit.accent }}
                  onClick={() => {
                    setSelectedId(outfit.id);
                    setNotice("");
                  }}
                  aria-pressed={active}
                >
                  {outfit.badge && <span className="store-card-badge">{outfit.badge}</span>}
                  <span className="store-card-avatar">
                    <AvatarRenderer
                      config={outfit.config}
                      itemSettings={outfit.settings}
                    />
                  </span>
                  <span className="store-card-copy">
                    <strong>{outfit.name}</strong>
                    {outfit.tagline && <small>{outfit.tagline}</small>}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="store-back-button"
            onClick={() => navigate("/")}
          >
            返回主頁
          </button>
        </section>
      </div>
      )}
    </main>
  );
}

export default Store;
