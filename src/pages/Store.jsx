import AvatarRenderer from "../components/AvatarRenderer";
import { STORE_CATALOG } from "../data/storeCatalog";
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
        <section className="store-catalog-panel" aria-label="造型預覽">
          <h2>造型預覽</h2>

          <div className="store-outfit-grid">
            {STORE_CATALOG.map((outfit) => (
              <article
                key={outfit.id}
                className="store-outfit-card"
                style={{ "--outfit-accent": outfit.accent || "#8b5cf6" }}
                aria-label="商城造型預覽"
              >
                <AvatarRenderer
                  config={outfit.config}
                  itemSettings={outfit.settings}
                />
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default Store;
