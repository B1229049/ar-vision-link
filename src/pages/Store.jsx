import { useEffect, useMemo, useState } from "react";
import AvatarRenderer from "../components/AvatarRenderer";
import { STORE_CATALOG } from "../data/storeCatalog";
import { getItemSetting, normalizeAvatarConfig } from "../utils/avatarConfig";
import "../styles/Store.css";

const OUTFIT_PRICE = 100;
const OUTFIT_CATEGORIES = [
  { key: "hair", label: "頭部" },
  { key: "face", label: "臉部" },
  { key: "top", label: "上半身" },
  { key: "bottoms", label: "下半身" },
];

function OutfitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4 4.5 6.2 3 11l3 1.2V20h12v-7.8l3-1.2-1.5-4.8L16 4l-4 2.2L8 4Z" />
      <path d="M9 4c.6 1.4 1.6 2.1 3 2.1S14.4 5.4 15 4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6" />
      <path d="M14.7 9.1c-.6-.5-1.4-.8-2.5-.8-1.3 0-2.2.6-2.2 1.6 0 .9.7 1.3 2.3 1.7 1.5.4 2.2.8 2.2 1.8 0 1.1-1 1.8-2.4 1.8-1.1 0-2.1-.4-2.9-1M12 6.9v10.2" />
    </svg>
  );
}

function getOutfitName(outfit) {
  const pieceLabel = outfit?.items?.top?.label || outfit?.items?.hair?.label;
  return pieceLabel?.split("・")[0]?.trim() || `造型 ${outfit?.id?.replace("outfit-", "") || ""}`;
}

function thumbStyle(setting) {
  return {
    transform: `translate(${Number(setting?.thumb_x_pct) || 0}%, ${
      Number(setting?.thumb_y_pct) || 0
    }%) scale(${Number(setting?.thumb_scale) || 1})`,
  };
}

function OutfitPieceThumbnail({ outfit, category }) {
  const item = outfit.items?.[category];
  if (!item) return null;

  if (item.thumbImg) {
    return (
      <img
        className="store-piece-layer"
        src={item.thumbImg}
        alt=""
        style={thumbStyle(getItemSetting(outfit.settings, item.id, "front"))}
      />
    );
  }

  return (
    <>
      {item.backImg && (
        <img
          className="store-piece-layer"
          src={item.backImg}
          alt=""
          style={thumbStyle(getItemSetting(outfit.settings, item.id, "back"))}
        />
      )}
      <img
        className="store-piece-layer"
        src={item.frontImg}
        alt=""
        style={thumbStyle(getItemSetting(outfit.settings, item.id, "front"))}
      />
      {item.overlayImg && (
        <img
          className="store-piece-layer"
          src={item.overlayImg}
          alt=""
          style={thumbStyle(getItemSetting(outfit.settings, item.id, "overlay"))}
        />
      )}
    </>
  );
}

function Store() {
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  }, []);
  const currentAvatarConfig = normalizeAvatarConfig(storedUser?.avatar_config);

  const [previewOutfitId, setPreviewOutfitId] = useState("");
  const [detailOutfitId, setDetailOutfitId] = useState("");
  const [coins, setCoins] = useState(Math.max(Number(storedUser?.coins) || 0, 0));
  const [ownedOutfits, setOwnedOutfits] = useState(
    Array.isArray(storedUser?.owned_outfits) ? storedUser.owned_outfits : []
  );
  const previewOutfit =
    STORE_CATALOG.find((outfit) => outfit.id === previewOutfitId) || null;
  const detailOutfit =
    STORE_CATALOG.find((outfit) => outfit.id === detailOutfitId) || null;
  const previewConfig = previewOutfit?.config || currentAvatarConfig;
  const previewSettings = previewOutfit?.settings;
  const ownedOutfitIds = new Set(ownedOutfits);

  useEffect(() => {
    if (!storedUser?.id) return;

    async function loadEconomy() {
      try {
        const backendUrl =
          import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";
        const response = await fetch(`${backendUrl}/api/users/${storedUser.id}/economy`);
        const result = await response.json();
        if (!response.ok || !result.success) return;

        setCoins(result.coins);
        setOwnedOutfits(result.owned_outfits);
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            ...storedUser,
            coins: result.coins,
            owned_outfits: result.owned_outfits,
          })
        );
      } catch (err) {
        console.warn("無法更新商城持有資料：", err);
      }
    }

    loadEconomy();
  }, [storedUser]);

  useEffect(() => {
    if (!detailOutfit) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setDetailOutfitId("");
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailOutfit]);

  return (
    <main className="store-page">
      <header className="store-header">
        <h1>商城</h1>
        <div className="store-price-note" aria-label={`持有 ${coins} 金幣`}>
          <CoinIcon />
          <strong>{coins}</strong>
        </div>
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
              <div className="store-tryon-character">
                <div className="store-tryon-platform" aria-hidden="true" />
                <AvatarRenderer
                  config={previewConfig}
                  itemSettings={previewSettings}
                  templateSettings={previewOutfit?.templates}
                  className="store-tryon-avatar"
                />
              </div>
            </div>
          </aside>

          <section className="store-catalog-panel" aria-label="造型預覽">
            <div className="store-outfit-grid">
              {STORE_CATALOG.map((outfit) => {
                const active = outfit.id === previewOutfitId;
                const owned = ownedOutfitIds.has(outfit.id);

                return (
                  <article
                    key={outfit.id}
                    className={`store-outfit-card ${active ? "active" : ""} ${owned ? "owned" : ""}`}
                    style={{ "--outfit-accent": outfit.accent || "#8b5cf6" }}
                  >
                    <button
                      type="button"
                      className="store-outfit-preview-button"
                      onClick={() => setPreviewOutfitId(outfit.id)}
                      aria-pressed={active}
                      aria-label={`預覽造型 ${outfit.id.replace("outfit-", "")}`}
                    >
                      <span className="store-card-visual">
                        <span className="store-card-avatar">
                        <AvatarRenderer
                          config={outfit.config}
                          itemSettings={outfit.settings}
                          templateSettings={outfit.templates}
                        />
                        </span>
                      </span>
                    </button>
                    <div className="store-card-actions">
                      <button
                        type="button"
                        className="store-card-menu-button"
                        onClick={() => setDetailOutfitId(outfit.id)}
                        aria-label={`查看 ${getOutfitName(outfit)} 詳情`}
                      >
                        <span aria-hidden="true">i</span>
                      </button>
                      <div className="store-card-price" aria-label={owned ? "已擁有" : `${OUTFIT_PRICE} 金幣`}>
                        {!owned && <CoinIcon />}
                        <strong>{owned ? "已擁有" : OUTFIT_PRICE}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {detailOutfit && (
        <div
          className="store-detail-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailOutfitId("");
          }}
        >
          <section
            className="store-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`造型 ${detailOutfit.id.replace("outfit-", "")} 詳細內容`}
          >
            <button
              type="button"
              className="store-detail-close"
              onClick={() => setDetailOutfitId("")}
              aria-label="關閉造型詳細內容"
            >
              <CloseIcon />
            </button>

            <div className="store-detail-main">
              <div className="store-detail-visual">
                <div className="store-detail-character">
                  <div className="store-detail-platform" aria-hidden="true" />
                  <AvatarRenderer
                    config={detailOutfit.config}
                    itemSettings={detailOutfit.settings}
                    templateSettings={detailOutfit.templates}
                  />
                </div>
              </div>

              <div className="store-detail-copy">
                <h3>包含以下內容：</h3>

                <div className="store-detail-pieces">
                  {OUTFIT_CATEGORIES.map((category) => (
                    <div className="store-piece-card" key={category.key}>
                      <span className="store-piece-thumbnail">
                        <OutfitPieceThumbnail
                          outfit={detailOutfit}
                          category={category.key}
                        />
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="store-detail-try-button"
                  onClick={() => {
                    setPreviewOutfitId(detailOutfit.id);
                    setDetailOutfitId("");
                  }}
                >
                  {ownedOutfitIds.has(detailOutfit.id) ? (
                    <span>已擁有・立即試穿</span>
                  ) : (
                    <><CoinIcon /><span>{OUTFIT_PRICE}</span></>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Store;
