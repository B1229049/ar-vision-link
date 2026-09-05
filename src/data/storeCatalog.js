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
    overlayImg: piece.overlay ? publicAsset(piece.overlay) : undefined,
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

export function getStoreTemplateSettingsForTop(itemId) {
  const outfit = STORE_CATALOG.find(
    (entry) => entry.items?.top?.id === itemId
  );

  return outfit?.templates || null;
}

export function normalizeOwnedOutfits(value) {
  if (!Array.isArray(value)) return [];

  const publishedIds = new Set(STORE_CATALOG.map((outfit) => outfit.id));
  return [...new Set(value.filter((id) => publishedIds.has(id)))];
}

export function getOwnedStoreItems(category, ownedOutfits) {
  const ownedIds = new Set(normalizeOwnedOutfits(ownedOutfits));

  return STORE_CATALOG.filter((outfit) => ownedIds.has(outfit.id))
    .map((outfit) => outfit.items?.[category])
    .filter(Boolean);
}
