import { useNavigate } from "react-router-dom";
import "../styles/CameraHub.css";

function CameraHub() {
  const navigate = useNavigate();

  return (
    <main className="camera-hub-page">
      <section className="camera-hub-grid" aria-label="ARcamera 功能選擇">
        <button
          type="button"
          className="camera-hub-panel camera-hub-recognition"
          onClick={() => navigate("/camera/recognition")}
        >
          <span className="camera-hub-icon" aria-hidden="true">◎</span>
          <span className="camera-hub-copy">
            <strong>ARcamera 舊有內容</strong>
            <small>多人即時人臉辨識與 AR 個人名牌展示</small>
          </span>
          <span className="camera-hub-action">開啟功能 →</span>
        </button>

        <button
          type="button"
          className="camera-hub-panel camera-hub-selfie"
          onClick={() => navigate("/ar-selfie")}
        >
          <span className="camera-hub-icon" aria-hidden="true">✦</span>
          <span className="camera-hub-copy">
            <strong>AR 自拍</strong>
            <small>套用色調與臉部特效，拍攝並儲存 AR 自拍</small>
          </span>
          <span className="camera-hub-action">開啟功能 →</span>
        </button>
      </section>
    </main>
  );
}

export default CameraHub;
