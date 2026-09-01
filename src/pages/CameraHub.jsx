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
          <span className="camera-hub-content">
            <span className="camera-hub-copy">
              <strong>ARcamera舊有內容</strong>
              <small>臉部掃描辨識</small>
            </span>
            <span className="camera-hub-action">開啟相機 →</span>
          </span>
        </button>

        <button
          type="button"
          className="camera-hub-panel camera-hub-selfie"
          onClick={() => navigate("/ar-selfie")}
        >
          <span className="camera-hub-content">
            <span className="camera-hub-copy">
              <strong>AR 自拍</strong>
              <small>套用 AR 特效與色調，完成你的自拍</small>
            </span>
            <span className="camera-hub-action">開啟相機 →</span>
          </span>
        </button>
      </section>
    </main>
  );
}

export default CameraHub;
