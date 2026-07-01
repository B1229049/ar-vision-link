import {
  DEFAULT_AVATAR_BODY_Y,
  DEFAULT_AVATAR_ITEM_SETTINGS,
  DEFAULT_AVATAR_TEMPLATE_SETTINGS,
} from "./avatarItemSettings";

const ASSET_BASE = `${import.meta.env.BASE_URL}avatar-assets`;

function asset(path) {
  return `${ASSET_BASE}/${path}`;
}

export const AVATAR_CATEGORIES = [
  { key: "hair", label: "頭髮" },
  { key: "face", label: "表情" },
  { key: "top", label: "上衣" },
  { key: "bottoms", label: "褲裝" },
];

export const AVATAR_ITEMS = {
  hair: [
    { id: "hair-1", label: "頭髮 01", frontImg: asset("hair/頭髮01.png") },
    { id: "hair-2", label: "頭髮 02", frontImg: asset("hair/頭髮02.png") },
    { id: "hair-3", label: "頭髮 03", frontImg: asset("hair/頭髮03.png") },
    { id: "hair-4", label: "頭髮 04", frontImg: asset("hair/頭髮04.png") },
    { id: "hair-5", label: "頭髮 05", frontImg: asset("hair/頭髮05.png") },
    {
      id: "hair-6",
      label: "頭髮 06",
      frontImg: asset("hair/頭髮06-1.png"),
      backImg: asset("hair/頭髮06-2.png"),
    },
    {
      id: "hair-7",
      label: "頭髮 07",
      frontImg: asset("hair/頭髮07-1.png"),
      backImg: asset("hair/頭髮07-2.png"),
    },
    { id: "hair-8", label: "頭髮 08", frontImg: asset("hair/頭髮08.png") },
    {
      id: "hair-9",
      label: "頭髮 09",
      frontImg: asset("hair/頭髮09-1.png"),
      backImg: asset("hair/頭髮09-2.png"),
    },
    {
      id: "hair-10",
      label: "頭髮 10",
      frontImg: asset("hair/頭髮10-1.png"),
      backImg: asset("hair/頭髮10-2.png"),
    },
    { id: "hair-11", label: "頭髮 11", frontImg: asset("hair/頭髮11.png") },
    { id: "hair-12", label: "頭髮 12", frontImg: asset("hair/頭髮12.png") },
  ],
  face: [
    { id: "face-1", label: "表情 01", frontImg: asset("face/表情01.png") },
    { id: "face-2", label: "表情 02", frontImg: asset("face/表情02.png") },
    { id: "face-3", label: "表情 03", frontImg: asset("face/表情03.png") },
    { id: "face-4", label: "表情 04", frontImg: asset("face/表情04.png") },
    { id: "face-5", label: "表情 05", frontImg: asset("face/表情05.png") },
    { id: "face-6", label: "表情 06", frontImg: asset("face/表情06.png") },
    { id: "face-7", label: "表情 07", frontImg: asset("face/表情07.png") },
    { id: "face-8", label: "表情 08", frontImg: asset("face/表情08.png") },
  ],
  top: [
    { id: "top-1", label: "上衣 01", frontImg: asset("top/上衣01.png") },
    { id: "top-2", label: "上衣 02", frontImg: asset("top/上衣02.png") },
    { id: "top-3", label: "上衣 03", frontImg: asset("top/上衣03.png") },
    { id: "top-4", label: "上衣 04", frontImg: asset("top/上衣04.png") },
    { id: "top-5", label: "上衣 05", frontImg: asset("top/上衣05.png") },
    { id: "top-6", label: "上衣 06", frontImg: asset("top/上衣06.png") },
    { id: "top-7", label: "上衣 07", frontImg: asset("top/上衣07.png") },
    { id: "top-8", label: "上衣 08", frontImg: asset("top/上衣08.png") },
    { id: "top-9", label: "上衣 09", frontImg: asset("top/上衣09.png") },
    { id: "top-10", label: "上衣 10", frontImg: asset("top/上衣10.png") },
    { id: "top-11", label: "上衣 11", frontImg: asset("top/上衣11.png") },
    { id: "top-12", label: "上衣 12", frontImg: asset("top/上衣12.png") },
  ],
  bottoms: [
    { id: "bottoms-1", label: "褲裝 01", frontImg: asset("bottoms/褲裝01.png") },
    { id: "bottoms-2", label: "褲裝 02", frontImg: asset("bottoms/褲裝02.png") },
    { id: "bottoms-3", label: "褲裝 03", frontImg: asset("bottoms/褲裝03.png") },
    { id: "bottoms-4", label: "褲裝 04", frontImg: asset("bottoms/褲裝04.png") },
    { id: "bottoms-5", label: "褲裝 05", frontImg: asset("bottoms/褲裝05.png") },
    { id: "bottoms-6", label: "褲裝 06", frontImg: asset("bottoms/褲裝06.png") },
    { id: "bottoms-7", label: "褲裝 07", frontImg: asset("bottoms/褲裝07.png") },
    { id: "bottoms-8", label: "褲裝 08", frontImg: asset("bottoms/褲裝08.png") },
  ],
};

export const DEFAULT_AVATAR_CONFIG = {
  hair: "hair-1",
  face: "face-1",
  top: "top-1",
  bottoms: "bottoms-1",
};

export const AVATAR_TEMPLATE = {
  base: asset("templates/模板00.png"),
  head: asset("templates/模板01.png"),
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
  DEFAULT_AVATAR_ITEM_SETTINGS,
  DEFAULT_AVATAR_TEMPLATE_SETTINGS,
};
