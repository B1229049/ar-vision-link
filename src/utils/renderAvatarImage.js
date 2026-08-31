import {
  AVATAR_CATEGORIES,
  AVATAR_TEMPLATE,
  DEFAULT_AVATAR_CROP_SETTINGS,
  getAvatarItem,
  getItemSetting,
  getTemplateSetting,
  getTemplateSettingsForConfig,
  normalizeAvatarConfig,
} from "./avatarConfig";

const STAGE_WIDTH = 408;
const STAGE_HEIGHT = 612;
const OUTPUT_SIZE = 256;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getContainRect(img) {
  const scale = Math.min(
    STAGE_WIDTH / img.naturalWidth,
    STAGE_HEIGHT / img.naturalHeight
  );

  const width = img.naturalWidth * scale;
  const height = img.naturalHeight * scale;

  return {
    x: (STAGE_WIDTH - width) / 2,
    y: STAGE_HEIGHT - height,
    width,
    height,
  };
}

async function drawLayer(ctx, src, setting) {
  if (!src) return;

  const img = await loadImage(src);
  const rect = getContainRect(img);
  const scale = Number(setting?.scale) || 1;
  const xPct = Number(setting?.x_pct) || 0;
  const yPct = Number(setting?.y_pct) || 0;

  ctx.save();
  ctx.translate(
    STAGE_WIDTH / 2 + (xPct / 100) * STAGE_WIDTH,
    STAGE_HEIGHT / 2 + (yPct / 100) * STAGE_HEIGHT
  );
  ctx.scale(scale, scale);
  ctx.drawImage(
    img,
    rect.x - STAGE_WIDTH / 2,
    rect.y - STAGE_HEIGHT / 2,
    rect.width,
    rect.height
  );
  ctx.restore();
}

export async function renderAvatarImage(
  config,
  itemSettings = {},
  templateSettings = {}
) {
  const normalizedConfig = normalizeAvatarConfig(config);
  const activeTemplateSettings = getTemplateSettingsForConfig(
    normalizedConfig,
    templateSettings
  );
  const stageCanvas = document.createElement("canvas");
  stageCanvas.width = STAGE_WIDTH;
  stageCanvas.height = STAGE_HEIGHT;

  const stageCtx = stageCanvas.getContext("2d");
  stageCtx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  const resolvedItems = AVATAR_CATEGORIES.reduce((acc, { key }) => {
    acc[key] = getAvatarItem(key, normalizedConfig[key]);
    return acc;
  }, {});

  for (const category of ["bottoms", "top", "face", "hair"]) {
    const item = resolvedItems[category];
    if (item?.backImg) {
      await drawLayer(
        stageCtx,
        item.backImg,
        getItemSetting(itemSettings, item.id, "back")
      );
    }
  }

  const storeBaseTemplateSetting = getTemplateSetting(
    "template-03",
    activeTemplateSettings
  );
  const baseTemplateSetting = getTemplateSetting(
    "template-00",
    activeTemplateSettings
  );
  const headTemplateSetting = getTemplateSetting(
    "template-01",
    activeTemplateSettings
  );
  const bodyTemplateSetting = getTemplateSetting(
    "template-02",
    activeTemplateSettings
  );

  if (baseTemplateSetting.visible !== false) {
    await drawLayer(stageCtx, AVATAR_TEMPLATE.base, baseTemplateSetting);
  }

  if (storeBaseTemplateSetting && storeBaseTemplateSetting.visible !== false) {
    await drawLayer(stageCtx, AVATAR_TEMPLATE.storeBase, storeBaseTemplateSetting);
  }

  if (headTemplateSetting.visible !== false) {
    await drawLayer(stageCtx, AVATAR_TEMPLATE.head, headTemplateSetting);
  }

  for (const category of ["hair", "face"]) {
    const item = resolvedItems[category];
    if (item?.frontImg) {
      await drawLayer(
        stageCtx,
        item.frontImg,
        getItemSetting(itemSettings, item.id, "front")
      );
    }
  }

  if (bodyTemplateSetting.visible !== false) {
    await drawLayer(stageCtx, AVATAR_TEMPLATE.body, bodyTemplateSetting);
  }

  for (const category of ["bottoms", "top"]) {
    const item = resolvedItems[category];
    if (item?.frontImg) {
      await drawLayer(
        stageCtx,
        item.frontImg,
        getItemSetting(itemSettings, item.id, "front")
      );
    }
  }

  if (resolvedItems.bottoms?.overlayImg) {
    await drawLayer(
      stageCtx,
      resolvedItems.bottoms.overlayImg,
      getItemSetting(itemSettings, resolvedItems.bottoms.id, "overlay")
    );
  }

  const crop = DEFAULT_AVATAR_CROP_SETTINGS;
  const cropSize = ((Number(crop.size_pct) || 46) / 100) * STAGE_WIDTH;
  const cropScale = Number(crop.scale) || 1;
  const sourceSize = cropSize * cropScale;
  const centerX =
    STAGE_WIDTH / 2 + ((Number(crop.x_pct) || 0) / 100) * cropSize;
  const centerY =
    STAGE_HEIGHT / 2 + ((Number(crop.y_pct) || 0) / 100) * cropSize;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;

  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  outputCtx.drawImage(
    stageCanvas,
    centerX - sourceSize / 2,
    centerY - sourceSize / 2,
    sourceSize,
    sourceSize,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return outputCanvas.toDataURL("image/png");
}
