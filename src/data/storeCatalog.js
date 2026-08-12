import { STORE_CATALOG_SOURCE } from "./storeCatalogData";

const PUBLIC_BASE = import.meta.env.BASE_URL;

function publicAsset(path) {
  return `${PUBLIC_BASE}${String(path || "").replace(/^\/+/, "")}`;
}

function resolvePiece(piece) {
  if (!piece) return null;

  return {
    id: piece.id,
    label: piece.label,
    frontImg: publicAsset(piece.front),
    backImg: piece.back ? publicAsset(piece.back) : undefined,
    thumbImg: piece.thumb ? publicAsset(piece.thumb) : undefined,
  };
}

export const STORE_CATALOG = STORE_CATALOG_SOURCE.filter(
  (outfit) => outfit.published !== false
).map((outfit) => ({
  ...outfit,
  items: {
    hair: resolvePiece(outfit.pieces?.hair),
    face: resolvePiece(outfit.pieces?.face),
    top: resolvePiece(outfit.pieces?.top),
    bottoms: resolvePiece(outfit.pieces?.bottoms),
  },
  config: {
    hair: outfit.pieces?.hair?.id,
    face: outfit.pieces?.face?.id,
    top: outfit.pieces?.top?.id,
    bottoms: outfit.pieces?.bottoms?.id,
  },
}));

export const STORE_ITEM_SETTINGS = STORE_CATALOG.reduce(
  (settings, outfit) => ({ ...settings, ...(outfit.settings || {}) }),
  {}
);

export function getStoreItem(category, itemId) {
  for (const outfit of STORE_CATALOG) {
    const item = outfit.items?.[category];
    if (item?.id === itemId) return item;
  }

  return null;
}
