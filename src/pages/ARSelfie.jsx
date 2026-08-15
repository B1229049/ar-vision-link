import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ARSelfie.css";

const FILTERS = [
  { id: "natural", label: "自然", value: "none", preview: "linear-gradient(135deg, #d6a77a, #f4d4bc)" },
  { id: "warm", label: "暖陽", value: "sepia(0.18) saturate(1.18) brightness(1.04)", preview: "linear-gradient(135deg, #f59e0b, #fde68a)" },
  { id: "cool", label: "冷調", value: "saturate(0.84) hue-rotate(10deg) brightness(1.05)", preview: "linear-gradient(135deg, #2563eb, #a5f3fc)" },
  { id: "vivid", label: "鮮明", value: "saturate(1.45) contrast(1.08)", preview: "linear-gradient(135deg, #ec4899, #8b5cf6, #22d3ee)" },
  { id: "soft", label: "柔霧", value: "brightness(1.08) contrast(0.9) saturate(0.9)", preview: "linear-gradient(135deg, #fbcfe8, #e9d5ff)" },
  { id: "film", label: "底片", value: "sepia(0.25) contrast(1.1) saturate(0.85)", preview: "linear-gradient(135deg, #92400e, #d6d3d1)" },
  { id: "mono", label: "黑白", value: "grayscale(1) contrast(1.08)", preview: "linear-gradient(135deg, #171717, #d4d4d4)" },
];

const EFFECTS = [
  { id: "none", label: "無特效", icon: "×" },
  { id: "sparkle", label: "星光", icon: "✦" },
  { id: "heart", label: "愛心", icon: "♥" },
  { id: "blush", label: "腮紅", icon: "●" },
  { id: "halo", label: "光環", icon: "◯" },
  { id: "freckles", label: "雀斑", icon: "∴" },
];

const BACKEND_URL = "https://ar-vision-link.onrender.com";

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 0.28);
  ctx.bezierCurveTo(-0.95, -0.4, -0.54, -1.15, 0, -0.55);
  ctx.bezierCurveTo(0.54, -1.15, 0.95, -0.4, 0, 0.28);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx, x, y, radius, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI / 4) * index - Math.PI / 2;
    const length = index % 2 === 0 ? radius : radius * 0.38;
    const pointX = Math.cos(angle) * length;
    const pointY = Math.sin(angle) * length;
    if (index === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function createThumbnail(canvas) {
  const maximumSide = 360;
  const scale = Math.min(1, maximumSide / Math.max(canvas.width, canvas.height));
  const thumbnail = document.createElement("canvas");
  thumbnail.width = Math.round(canvas.width * scale);
  thumbnail.height = Math.round(canvas.height * scale);
  thumbnail.getContext("2d").drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
  return thumbnail.toDataURL("image/jpeg", 0.72);
}

function ARSelfie() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const streamRef = useRef(null);
  const filterRef = useRef("none");
  const effectRef = useRef("sparkle");
  const [filterId, setFilterId] = useState("natural");
  const [effectId, setEffectId] = useState("sparkle");
  const [status, setStatus] = useState("正在啟動相機...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    async function start() {
      if (!window.FaceMesh || !window.Camera) {
        setStatus("AR 模組載入失敗，請重新整理頁面後再試。");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        faceMesh.onResults(drawFrame);

        const camera = new window.Camera(videoRef.current, {
          width: 1280,
          height: 720,
          onFrame: async () => faceMesh.send({ image: videoRef.current }),
        });
        cameraRef.current = camera;
        camera.start();
        setStatus("選擇濾鏡與特效後，按下快門拍照。");
      } catch (error) {
        console.error("AR 自拍相機啟動失敗", error);
        setStatus("無法開啟相機，請允許瀏覽器使用前鏡頭。");
      }
    }

    start();
    return () => {
      cameraRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  function drawFrame(results) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.filter = filterRef.current;
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const landmarks = results.multiFaceLandmarks?.[0];
    if (!landmarks) return;

    // Flip x again here so overlay coordinates align with the mirrored preview.
    const point = (index) => ({ x: (1 - landmarks[index].x) * width, y: landmarks[index].y * height });
    const forehead = point(10);
    const leftCheek = point(234);
    const rightCheek = point(454);

    if (effectRef.current === "sparkle") {
      const pulse = 1 + Math.sin(Date.now() / 180) * 0.16;
      [[forehead.x - width * 0.14, forehead.y - height * 0.08], [forehead.x + width * 0.14, forehead.y - height * 0.04], [forehead.x, forehead.y - height * 0.18]].forEach(([x, y], index) => {
        drawStar(ctx, x, y, (16 + index * 3) * pulse, "rgba(255, 244, 170, 0.95)");
      });
    }

    if (effectRef.current === "heart") {
      drawHeart(ctx, forehead.x - width * 0.11, forehead.y - height * 0.16, 44, "rgba(255, 96, 142, 0.92)");
      drawHeart(ctx, forehead.x + width * 0.1, forehead.y - height * 0.1, 30, "rgba(255, 166, 194, 0.9)");
    }

    if (effectRef.current === "blush") {
      ctx.save();
      ctx.filter = "blur(16px)";
      ctx.fillStyle = "rgba(255, 105, 142, 0.34)";
      [[leftCheek.x + width * 0.035, leftCheek.y], [rightCheek.x - width * 0.035, rightCheek.y]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, width * 0.055, height * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (effectRef.current === "halo") {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 232, 125, 0.96)";
      ctx.lineWidth = Math.max(7, width * 0.006);
      ctx.shadowColor = "rgba(255, 213, 74, 0.9)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(forehead.x, forehead.y - height * 0.16, width * 0.13, height * 0.026, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (effectRef.current === "freckles") {
      ctx.save();
      ctx.fillStyle = "rgba(126, 73, 51, 0.72)";
      [leftCheek, rightCheek].forEach((cheek, sideIndex) => {
        for (let index = 0; index < 6; index += 1) {
          const direction = sideIndex === 0 ? 1 : -1;
          const x = cheek.x + direction * (width * (0.016 + index * 0.009));
          const y = cheek.y - height * 0.018 + (index % 2) * height * 0.012;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2.4, width * 0.0027), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }
  }

  function centerSelectedOption(element) {
    element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function selectFilter(filter, element) {
    filterRef.current = filter.value;
    setFilterId(filter.id);
    centerSelectedOption(element);
  }

  function selectEffect(effect, element) {
    effectRef.current = effect.id;
    setEffectId(effect.id);
    centerSelectedOption(element);
  }

  async function saveSelfie() {
    const canvas = canvasRef.current;
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!canvas || !user?.id || !canvas.width || saving) return;

    setSaving(true);
    setStatus("正在儲存照片...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${user.id}/ar-selfies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: canvas.toDataURL("image/jpeg", 0.82),
          thumbnail: createThumbnail(canvas),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "照片儲存失敗");
      navigate("/profile");
    } catch (error) {
      setStatus(error.message || "照片儲存失敗，請再試一次。");
      setSaving(false);
    }
  }

  return (
    <main className="ar-selfie-page">
      <section className="ar-selfie-viewfinder" aria-label="AR 自拍預覽">
        <video ref={videoRef} className="ar-selfie-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="ar-selfie-canvas" />
        <p className="ar-selfie-status">{status}</p>
      </section>

      <section className="ar-selfie-controls">
        <div className="ar-selfie-control-group">
          <div className="ar-selfie-control-heading">
            <strong>整體色調</strong>
            <span>左右滑動選擇</span>
          </div>
          <div className="ar-selfie-control-row" role="radiogroup" aria-label="選擇整體色調">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="radio"
                aria-checked={filterId === filter.id}
                className={`ar-selfie-option ar-selfie-filter-option${filterId === filter.id ? " is-selected" : ""}`}
                onClick={(event) => selectFilter(filter, event.currentTarget)}
              >
                <span className="ar-selfie-option-preview" style={{ background: filter.preview }} />
                <span className="ar-selfie-option-label">{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ar-selfie-control-group">
          <div className="ar-selfie-control-heading">
            <strong>臉部特效</strong>
            <span>左右滑動選擇</span>
          </div>
          <div className="ar-selfie-control-row" role="radiogroup" aria-label="選擇臉部特效">
            {EFFECTS.map((effect) => (
              <button
                key={effect.id}
                type="button"
                role="radio"
                aria-checked={effectId === effect.id}
                className={`ar-selfie-option ar-selfie-effect-option${effectId === effect.id ? " is-selected" : ""}`}
                onClick={(event) => selectEffect(effect, event.currentTarget)}
              >
                <span className="ar-selfie-option-preview">{effect.icon}</span>
                <span className="ar-selfie-option-label">{effect.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ar-selfie-capture-actions">
          <button className="ar-selfie-shutter" type="button" onClick={saveSelfie} disabled={saving} aria-label="拍攝並儲存到動態牆"><span /></button>
          <button className="ar-selfie-back" type="button" onClick={() => navigate("/profile")}>返回</button>
        </div>
      </section>
    </main>
  );
}

export default ARSelfie;
