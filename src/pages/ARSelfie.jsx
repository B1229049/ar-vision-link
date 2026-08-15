import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ARSelfie.css";

const FILTERS = [
  { id: "natural", label: "自然", value: "none" },
  { id: "warm", label: "暖陽", value: "sepia(0.22) saturate(1.3) brightness(1.05)" },
  { id: "cool", label: "冷調", value: "saturate(0.9) hue-rotate(12deg) brightness(1.06)" },
  { id: "vivid", label: "鮮明", value: "saturate(1.55) contrast(1.12)" },
  { id: "soft", label: "柔霧", value: "brightness(1.1) contrast(0.86) saturate(0.88)" },
  { id: "film", label: "底片", value: "sepia(0.32) contrast(1.14) saturate(0.78)" },
  { id: "mono", label: "黑白", value: "grayscale(1) contrast(1.12)" },
];

const EFFECTS = [
  { id: "none", label: "無特效", icon: "×" },
  { id: "sparkle", label: "星光", icon: "✦" },
  { id: "heart", label: "愛心", icon: "♥" },
  { id: "blush", label: "腮紅", icon: "●" },
  { id: "halo", label: "光環", icon: "◯" },
  { id: "freckles", label: "雀斑", icon: "∴" },
  { id: "sunglasses", label: "墨鏡", icon: "▰" },
  { id: "mask", label: "面具", icon: "◒" },
  { id: "crown", label: "皇冠", icon: "♛" },
  { id: "cat", label: "貓咪", icon: "ฅ" },
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

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function createFilteredSnapshot(source, filterId) {
  const snapshot = document.createElement("canvas");
  snapshot.width = source.width;
  snapshot.height = source.height;
  const ctx = snapshot.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);

  if (filterId === "natural") return snapshot;

  const imageData = ctx.getImageData(0, 0, snapshot.width, snapshot.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    let red = pixels[index];
    let green = pixels[index + 1];
    let blue = pixels[index + 2];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

    if (filterId === "warm") {
      red = red * 1.1 + 10;
      green = green * 1.04 + 3;
      blue *= 0.88;
    } else if (filterId === "cool") {
      red *= 0.9;
      green = green * 1.03 + 2;
      blue = blue * 1.13 + 8;
    } else if (filterId === "vivid") {
      red = luminance + (red - luminance) * 1.5;
      green = luminance + (green - luminance) * 1.5;
      blue = luminance + (blue - luminance) * 1.5;
      red = (red - 128) * 1.1 + 128;
      green = (green - 128) * 1.1 + 128;
      blue = (blue - 128) * 1.1 + 128;
    } else if (filterId === "soft") {
      red = ((red - 128) * 0.88 + 128) * 0.92 + 255 * 0.08;
      green = ((green - 128) * 0.88 + 128) * 0.92 + 247 * 0.08;
      blue = ((blue - 128) * 0.88 + 128) * 0.92 + 252 * 0.08;
    } else if (filterId === "film") {
      const sepiaRed = red * 0.393 + green * 0.769 + blue * 0.189;
      const sepiaGreen = red * 0.349 + green * 0.686 + blue * 0.168;
      const sepiaBlue = red * 0.272 + green * 0.534 + blue * 0.131;
      red = ((red * 0.58 + sepiaRed * 0.42) - 128) * 1.1 + 128;
      green = ((green * 0.58 + sepiaGreen * 0.42) - 128) * 1.1 + 128;
      blue = ((blue * 0.58 + sepiaBlue * 0.42) - 128) * 1.1 + 128;
    } else if (filterId === "mono") {
      const contrastLuminance = (luminance - 128) * 1.12 + 128;
      red = contrastLuminance;
      green = contrastLuminance;
      blue = contrastLuminance;
    }

    pixels[index] = clampColor(red);
    pixels[index + 1] = clampColor(green);
    pixels[index + 2] = clampColor(blue);
  }

  ctx.putImageData(imageData, 0, 0);
  return snapshot;
}

function ARSelfie() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const streamRef = useRef(null);
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
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const landmarks = results.multiFaceLandmarks?.[0];
    if (!landmarks) return;

    // Flip x again here so overlay coordinates align with the mirrored preview.
    const point = (index) => ({ x: (1 - landmarks[index].x) * width, y: landmarks[index].y * height });
    const forehead = point(10);
    const leftCheek = point(234);
    const rightCheek = point(454);
    const leftEye = point(33);
    const rightEye = point(263);
    const nose = point(1);
    const chin = point(152);
    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };

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

    if (effectRef.current === "sunglasses") {
      ctx.save();
      ctx.translate(eyeCenter.x, eyeCenter.y);
      ctx.rotate(eyeAngle);
      ctx.fillStyle = "rgba(5, 8, 18, 0.94)";
      ctx.strokeStyle = "rgba(225, 231, 239, 0.92)";
      ctx.lineWidth = Math.max(4, eyeDistance * 0.035);
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 10;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.ellipse(side * eyeDistance * 0.28, 0, eyeDistance * 0.29, eyeDistance * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(-eyeDistance * 0.03, 0);
      ctx.quadraticCurveTo(0, -eyeDistance * 0.09, eyeDistance * 0.03, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-eyeDistance * 0.56, -eyeDistance * 0.04);
      ctx.lineTo(-eyeDistance * 0.76, -eyeDistance * 0.13);
      ctx.moveTo(eyeDistance * 0.56, -eyeDistance * 0.04);
      ctx.lineTo(eyeDistance * 0.76, -eyeDistance * 0.13);
      ctx.stroke();
      ctx.restore();
    }

    if (effectRef.current === "mask") {
      const maskLeft = point(93);
      const maskRight = point(323);
      const maskBottom = {
        x: (chin.x + nose.x) / 2,
        y: chin.y - (chin.y - nose.y) * 0.12,
      };
      ctx.save();
      const maskGradient = ctx.createLinearGradient(maskLeft.x, nose.y, maskRight.x, maskBottom.y);
      maskGradient.addColorStop(0, "rgba(49, 46, 129, 0.96)");
      maskGradient.addColorStop(0.5, "rgba(126, 34, 206, 0.97)");
      maskGradient.addColorStop(1, "rgba(30, 64, 175, 0.96)");
      ctx.fillStyle = maskGradient;
      ctx.strokeStyle = "rgba(216, 180, 254, 0.95)";
      ctx.lineWidth = Math.max(3, width * 0.003);
      ctx.beginPath();
      ctx.moveTo(maskLeft.x, nose.y - eyeDistance * 0.02);
      ctx.quadraticCurveTo(nose.x, nose.y + eyeDistance * 0.12, maskRight.x, nose.y - eyeDistance * 0.02);
      ctx.lineTo(maskRight.x - eyeDistance * 0.05, maskBottom.y - eyeDistance * 0.05);
      ctx.quadraticCurveTo(maskBottom.x, maskBottom.y + eyeDistance * 0.1, maskLeft.x + eyeDistance * 0.05, maskBottom.y - eyeDistance * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.45;
      for (let line = 1; line <= 3; line += 1) {
        const y = nose.y + (maskBottom.y - nose.y) * (line / 5);
        ctx.beginPath();
        ctx.moveTo(maskLeft.x + eyeDistance * 0.12, y);
        ctx.lineTo(maskRight.x - eyeDistance * 0.12, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (effectRef.current === "crown") {
      const crownWidth = eyeDistance * 1.35;
      const crownHeight = eyeDistance * 0.62;
      const crownX = forehead.x - crownWidth / 2;
      const crownY = forehead.y - crownHeight * 1.12;
      ctx.save();
      const crownGradient = ctx.createLinearGradient(crownX, crownY, crownX, crownY + crownHeight);
      crownGradient.addColorStop(0, "#fff4a3");
      crownGradient.addColorStop(1, "#f59e0b");
      ctx.fillStyle = crownGradient;
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = Math.max(3, width * 0.003);
      ctx.shadowColor = "rgba(251, 191, 36, 0.8)";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(crownX, crownY + crownHeight);
      ctx.lineTo(crownX + crownWidth * 0.08, crownY + crownHeight * 0.25);
      ctx.lineTo(crownX + crownWidth * 0.3, crownY + crownHeight * 0.58);
      ctx.lineTo(crownX + crownWidth * 0.5, crownY);
      ctx.lineTo(crownX + crownWidth * 0.7, crownY + crownHeight * 0.58);
      ctx.lineTo(crownX + crownWidth * 0.92, crownY + crownHeight * 0.25);
      ctx.lineTo(crownX + crownWidth, crownY + crownHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (effectRef.current === "cat") {
      const earWidth = eyeDistance * 0.48;
      const earHeight = eyeDistance * 0.58;
      ctx.save();
      ctx.fillStyle = "rgba(35, 22, 54, 0.96)";
      ctx.strokeStyle = "rgba(244, 114, 182, 0.94)";
      ctx.lineWidth = Math.max(3, width * 0.003);
      [-1, 1].forEach((side) => {
        const baseX = forehead.x + side * eyeDistance * 0.48;
        const baseY = forehead.y - eyeDistance * 0.06;
        ctx.beginPath();
        ctx.moveTo(baseX - earWidth / 2, baseY);
        ctx.lineTo(baseX + side * earWidth * 0.18, baseY - earHeight);
        ctx.lineTo(baseX + earWidth / 2, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.fillStyle = "rgba(244, 114, 182, 0.92)";
      ctx.beginPath();
      ctx.moveTo(nose.x - eyeDistance * 0.08, nose.y + eyeDistance * 0.04);
      ctx.lineTo(nose.x + eyeDistance * 0.08, nose.y + eyeDistance * 0.04);
      ctx.lineTo(nose.x, nose.y + eyeDistance * 0.13);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = Math.max(2, width * 0.002);
      [-1, 1].forEach((side) => {
        for (let line = -1; line <= 1; line += 1) {
          ctx.beginPath();
          ctx.moveTo(nose.x + side * eyeDistance * 0.12, nose.y + eyeDistance * (0.12 + line * 0.035));
          ctx.lineTo(nose.x + side * eyeDistance * 0.58, nose.y + eyeDistance * (0.1 + line * 0.1));
          ctx.stroke();
        }
      });
      ctx.restore();
    }
  }

  function centerSelectedOption(element) {
    element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function selectFilter(filter, element) {
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
      const snapshot = createFilteredSnapshot(canvas, filterId);
      const response = await fetch(`${BACKEND_URL}/api/users/${user.id}/ar-selfies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: snapshot.toDataURL("image/jpeg", 0.82),
          thumbnail: createThumbnail(snapshot),
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

  const activeFilter = FILTERS.find((filter) => filter.id === filterId)?.value || "none";

  return (
    <main className="ar-selfie-page">
      <section className="ar-selfie-viewfinder" aria-label="AR 自拍預覽">
        <video ref={videoRef} className="ar-selfie-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="ar-selfie-canvas" style={{ filter: activeFilter }} />
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
                {filter.label}
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
