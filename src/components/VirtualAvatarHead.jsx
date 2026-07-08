import AvatarRenderer from "./AvatarRenderer";
import { DEFAULT_AVATAR_CROP_SETTINGS } from "../utils/avatarConfig";
import "../styles/VirtualAvatarHead.css";

function VirtualAvatarHead({ config, className = "" }) {
  const crop = DEFAULT_AVATAR_CROP_SETTINGS;
  const sizePct = Number(crop.size_pct) || 46;
  const scale = Number(crop.scale) || 1;
  const xPct = Number(crop.x_pct) || 0;
  const yPct = Number(crop.y_pct) || 0;

  const sourceSizePct = sizePct * scale;
  const stageWidthPct = 10000 / sourceSizePct;
  const stageHeightPct = stageWidthPct * 1.5;
  const rendererLeftPct = -(5000 / sourceSizePct + xPct / scale - 50);
  const rendererTopPct = -(7500 / sourceSizePct + yPct / scale - 50);

  return (
    <div className={`virtual-avatar-head ${className}`}>
      <AvatarRenderer
        config={config}
        className="virtual-avatar-head-renderer"
        style={{
          "--avatar-head-stage-width": `${stageWidthPct}%`,
          "--avatar-head-stage-height": `${stageHeightPct}%`,
          "--avatar-head-left": `${rendererLeftPct}%`,
          "--avatar-head-top": `${rendererTopPct}%`,
        }}
      />
    </div>
  );
}

export default VirtualAvatarHead;
