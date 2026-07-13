import {
  DEFAULT_AVATAR_BODY_Y,
  DEFAULT_AVATAR_CROP_SETTINGS,
  DEFAULT_AVATAR_ITEM_SETTINGS,
  DEFAULT_AVATAR_TEMPLATE_SETTINGS,
} from "./avatarItemSettings";

const ASSET_BASE = `${import.meta.env.BASE_URL}avatar-assets`;

function asset(path) {
  return `${ASSET_BASE}/${path}`;
}

export const AVATAR_CATEGORIES = [
  { key: "hair", label: "頭部" },
  { key: "face", label: "臉部" },
  { key: "top", label: "上半身" },
  { key: "bottoms", label: "下半身" },
];

const splitHairIds = new Set([7, 8, 10, 14, 15]);

function numberedItem(category, prefix, number) {
  const padded = String(number).padStart(2, "0");

  return {
    id: `${category}-${number}`,
    label: `${prefix} ${padded}`,
    frontImg: asset(`${category}/${prefix}${padded}.png`),
  };
}

function hairItem(number) {
  const padded = String(number).padStart(2, "0");
  const basePath = `hair/頭髮${padded}`;
  const item = {
    id: `hair-${number}`,
    label: `頭髮 ${padded}`,
    thumbImg: asset(`${basePath}-0.png`),
  };

  if (splitHairIds.has(number)) {
    return {
      ...item,
      frontImg: asset(`${basePath}-1.png`),
      backImg: asset(`${basePath}-2.png`),
    };
  }

  return { ...item, frontImg: asset(`${basePath}.png`) };
}

export const AVATAR_ITEMS = {
  hair: Array.from({ length: 16 }, (_, index) => hairItem(index + 1)),
  face: Array.from({ length: 12 }, (_, index) =>
    numberedItem("face", "表情", index + 1)
  ),
  top: Array.from({ length: 16 }, (_, index) =>
    numberedItem("top", "上衣", index + 1)
  ),
  bottoms: Array.from({ length: 8 }, (_, index) =>
    numberedItem("bottoms", "褲裝", index + 1)
  ),
};

export const DEFAULT_AVATAR_CONFIG = {
  hair: "hair-1",
  face: "face-1",
  top: "top-1",
  bottoms: "bottoms-1",
};

export const AVATAR_TEMPLATE = {
  base: asset("templates/模板00.png"),
  body: asset("templates/模板02.png"),
};

export function getAvatarItem(category, itemId) {
  return AVATAR_ITEMS[category]?.find((item) => item.id === itemId) || null;
}

export function normalizeAvatarConfig(config) {
  const next = { ...DEFAULT_AVATAR_CONFIG };

  if (config && typeof config === "object") {
    AVATAR_CATEGORIES.forEach(({ key }) => {
      if (getAvatarItem(key, config[key])) {
        next[key] = config[key];
      }
    });
  }

  return next;
}

export function getItemSetting(settings, itemId, layer = "front") {
  const fallback = {
    scale: 1,
    x: 0,
    y: 0,
    thumb_scale: 1,
    thumb_x: 0,
    thumb_y: 0,
  };

  const runtimeSettings =
    settings && typeof settings === "object" ? settings : {};

  return (
    runtimeSettings[`${itemId}_${layer}`] ||
    runtimeSettings[itemId] ||
    DEFAULT_AVATAR_ITEM_SETTINGS[`${itemId}_${layer}`] ||
    DEFAULT_AVATAR_ITEM_SETTINGS[itemId] ||
    fallback
  );
}

export function getTemplateSetting(templateId) {
  return (
    DEFAULT_AVATAR_TEMPLATE_SETTINGS[templateId] || {
      scale: 1,
      x_pct: 0,
      y_pct: 0,
    }
  );
}

export {
  DEFAULT_AVATAR_BODY_Y,
  DEFAULT_AVATAR_CROP_SETTINGS,
  DEFAULT_AVATAR_ITEM_SETTINGS,
  DEFAULT_AVATAR_TEMPLATE_SETTINGS,
};
