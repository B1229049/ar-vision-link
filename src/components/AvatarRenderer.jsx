import {
  AVATAR_CATEGORIES,
  DEFAULT_AVATAR_BODY_Y,
  AVATAR_TEMPLATE,
  getAvatarItem,
  getItemSetting,
  getTemplateSetting,
  getTemplateSettingsForConfig,
  normalizeAvatarConfig,
} from "../utils/avatarConfig";
import "../styles/AvatarRenderer.css";

function layerStyle(setting) {
  const scale = Number(setting?.scale) || 1;
  const hasRelativePosition =
    setting?.x_pct !== undefined || setting?.y_pct !== undefined;

  if (hasRelativePosition) {
    const xPct = Number(setting?.x_pct) || 0;
    const yPct = Number(setting?.y_pct) || 0;

    return {
      transform: `translate(${xPct}%, ${yPct}%) scale(${scale})`,
    };
  }

  const x = Number(setting?.x) || 0;
  const y = Number(setting?.y) || 0;

  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
  };
}

function AvatarRenderer({ config, itemSettings, templateSettings, className = "", style }) {
  const normalizedConfig = normalizeAvatarConfig(config);
  const bodyY = Number(DEFAULT_AVATAR_BODY_Y) || 0;
  const activeTemplateSettings = getTemplateSettingsForConfig(
    normalizedConfig,
    templateSettings
  );
  const hasStoreBase = Boolean(activeTemplateSettings?.["template-03"]);
  const storeBaseTemplateSetting = hasStoreBase
    ? getTemplateSetting("template-03", activeTemplateSettings)
    : null;
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

  const resolvedItems = AVATAR_CATEGORIES.reduce((acc, { key }) => {
    acc[key] = getAvatarItem(key, normalizedConfig[key]);
    return acc;
  }, {});

  return (
    <div className={`avatar-renderer ${className}`} style={style}>
      <div className="avatar-renderer-inner">
        {["bottoms", "top", "face", "hair"].map((category) => {
          const item = resolvedItems[category];
          if (!item?.backImg) return null;

          return (
            <img
              key={`${category}-back`}
              className={`avatar-layer avatar-layer-${category}-back`}
              src={item.backImg}
              alt=""
              style={layerStyle(getItemSetting(itemSettings, item.id, "back"))}
            />
          );
        })}

        {baseTemplateSetting.visible !== false && (
          <img
            className="avatar-layer avatar-base"
            src={AVATAR_TEMPLATE.base}
            alt=""
            style={layerStyle(baseTemplateSetting)}
          />
        )}

        {storeBaseTemplateSetting && storeBaseTemplateSetting.visible !== false && (
          <img
            className="avatar-layer avatar-base"
            src={AVATAR_TEMPLATE.storeBase}
            alt=""
            style={layerStyle(storeBaseTemplateSetting)}
          />
        )}

        {headTemplateSetting.visible !== false && (
          <img
            className="avatar-layer avatar-head"
            src={AVATAR_TEMPLATE.head}
            alt=""
            style={layerStyle(headTemplateSetting)}
          />
        )}

        {resolvedItems.hair && (
          <img
            className="avatar-layer avatar-layer-hair"
            src={resolvedItems.hair.frontImg}
            alt=""
            style={layerStyle(
              getItemSetting(itemSettings, resolvedItems.hair.id, "front")
            )}
          />
        )}

        {resolvedItems.face && (
          <img
            className="avatar-layer avatar-layer-face"
            src={resolvedItems.face.frontImg}
            alt=""
            style={layerStyle(
              getItemSetting(itemSettings, resolvedItems.face.id, "front")
            )}
          />
        )}

        {bodyTemplateSetting.visible !== false && (
          <img
            className="avatar-layer avatar-body"
            src={AVATAR_TEMPLATE.body}
            alt=""
            style={
              bodyTemplateSetting.x_pct !== undefined ||
              bodyTemplateSetting.y_pct !== undefined ||
              bodyTemplateSetting.x !== undefined ||
              bodyTemplateSetting.y !== undefined
                ? layerStyle(bodyTemplateSetting)
                : { transform: `translateY(${bodyY}px)` }
            }
          />
        )}

        {resolvedItems.bottoms && (
          <img
            className="avatar-layer avatar-layer-bottoms"
            src={resolvedItems.bottoms.frontImg}
            alt=""
            style={layerStyle(
              getItemSetting(itemSettings, resolvedItems.bottoms.id, "front")
            )}
          />
        )}

        {resolvedItems.top && (
          <img
            className="avatar-layer avatar-layer-top"
            src={resolvedItems.top.frontImg}
            alt="使用者虛擬替身"
            style={layerStyle(
              getItemSetting(itemSettings, resolvedItems.top.id, "front")
            )}
          />
        )}

        {resolvedItems.bottoms?.overlayImg && (
          <img
            className="avatar-layer avatar-layer-bottoms-overlay"
            src={resolvedItems.bottoms.overlayImg}
            alt=""
            style={layerStyle(
              getItemSetting(itemSettings, resolvedItems.bottoms.id, "overlay")
            )}
          />
        )}
      </div>
    </div>
  );
}

export default AvatarRenderer;
