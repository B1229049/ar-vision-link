import { useMemo, useState } from "react";
import AvatarRenderer from "../components/AvatarRenderer";
import { STORE_CATALOG } from "../data/storeCatalog";
import { normalizeAvatarConfig } from "../utils/avatarConfig";
import "../styles/Store.css";

function OutfitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4 4.5 6.2 3 11l3 1.2V20h12v-7.8l3-1.2-1.5-4.8L16 4l-4 2.2L8 4Z" />
      <path d="M9 4c.6 1.4 1.6 2.1 3 2.1S14.4 5.4 15 4" />
    </svg>
  );
}

function Store() {
  const currentAvatarConfig = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("currentUser") || "null");
      return normalizeAvatarConfig(user?.avatar_config);
    } catch {
      return normalizeAvatarConfig();
    }
  }, []);

  const [previewOutfitId, setPreviewOutfitId] = useState("");
  const previewOutfit =
    STORE_CATALOG.find((outfit) => outfit.id === previewOutfitId) || null;
  const previewConfig = previewOutfit?.config || currentAvatarConfig;
  const previewSettings = previewOutfit?.settings;

  return (
    <main className="store-page">
      <header className="store-header">
        <h1>商城</h1>
      </header>

      {STORE_CATALOG.length === 0 ? (
        <section className="store-empty">
          <OutfitIcon />
          <h2>目前尚未上架任何造型</h2>
        </section>
      ) : (
        <div className="store-layout">
          <aside className="store-tryon-panel" aria-label="Avatar 試穿預覽">
            <div className="store-tryon-stage">
              <div className="store-tryon-platform" aria-hidden="true" />
              <AvatarRenderer
                config={previewConfig}
                itemSettings={previewSettings}
                templateSettings={previewOutfit?.templates}
                className="store-tryon-avatar"
              />
            </div>
          </aside>

          <section className="store-catalog-panel" aria-label="造型預覽">
            <div className="store-outfit-grid">
              {STORE_CATALOG.map((outfit) => {
                const active = outfit.id === previewOutfitId;

                return (
                  <button
                    type="button"
                    key={outfit.id}
                    className={`store-outfit-card ${active ? "active" : ""}`}
                    style={{ "--outfit-accent": outfit.accent || "#8b5cf6" }}
                    onClick={() => setPreviewOutfitId(outfit.id)}
                    aria-pressed={active}
                    aria-label={`預覽造型 ${outfit.id.replace("outfit-", "")}`}
                  >
                    <span className="store-card-avatar">
                      <AvatarRenderer
                        config={outfit.config}
                        itemSettings={outfit.settings}
                        templateSettings={outfit.templates}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Store;
