import {
  AVATAR_CATEGORIES,
  DEFAULT_AVATAR_BODY_Y,
  AVATAR_TEMPLATE,
  getAvatarItem,
  getItemSetting,
  getTemplateSetting,
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

function AvatarRenderer({ config, itemSettings, className = "", style }) {
  const normalizedConfig = normalizeAvatarConfig(config);
  const bodyY = Number(DEFAULT_AVATAR_BODY_Y) || 0;
  const baseTemplateSetting = getTemplateSetting("template-00");
  const bodyTemplateSetting = getTemplateSetting("template-02");

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

        <img
          className="avatar-layer avatar-base"
          src={AVATAR_TEMPLATE.base}
          alt=""
          style={layerStyle(baseTemplateSetting)}
        />

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
      </div>
    </div>
  );
}

export default AvatarRenderer;
