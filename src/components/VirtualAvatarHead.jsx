import AvatarRenderer from "./AvatarRenderer";
import { DEFAULT_AVATAR_CROP_SETTINGS } from "../utils/avatarConfig";
import "../styles/VirtualAvatarHead.css";

function VirtualAvatarHead({ config, className = "" }) {
  const crop = DEFAULT_AVATAR_CROP_SETTINGS;
  const sizePct = Number(crop.size_pct) || 46;
  const scale = Number(crop.scale) || 1;
  const xPct = Number(crop.x_pct) || 0;
  const yPct = Number(crop.y_pct) || 0;

  const stageWidthPct = (10000 / sizePct) * scale;
  const translateX = -50 - xPct;
  const translateY = -50 - yPct;

  return (
    <div className={`virtual-avatar-head ${className}`}>
      <AvatarRenderer
        config={config}
        className="virtual-avatar-head-renderer"
        style={{
          "--avatar-head-stage-width": `${stageWidthPct}%`,
          "--avatar-head-translate-x": `${translateX}%`,
          "--avatar-head-translate-y": `${translateY}%`,
        }}
      />
    </div>
  );
}

export default VirtualAvatarHead;
