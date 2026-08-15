import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  AR_SELFIE_EFFECTS,
  createFilteredSnapshot,
  createSelfieThumbnail,
  renderFaceEffect,
  smoothFaceLandmarks,
} from "../utils/arSelfieEffects";
import { ARSelfie3DRenderer, isThreeEffect } from "../utils/arSelfie3D";
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

const BACKEND_URL = "https://ar-vision-link.onrender.com";
const VISION_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function ARSelfie() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const smoothedLandmarksRef = useRef(null);
  const effectRef = useRef("sparkle");
  const threeRendererRef = useRef(null);

  const [filterId, setFilterId] = useState("natural");
  const [effectId, setEffectId] = useState("sparkle");
  const [status, setStatus] = useState("正在啟動相機...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    let lastVideoTime = -1;
    let lastDetectionTime = 0;
    let latestResults = null;
    let missingFaceFrames = 0;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function drawVideoFrame(video, canvas) {
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
      return { ctx, width, height };
    }

    function renderLoop(timestamp) {
      if (!mounted) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const threeRenderer = threeRendererRef.current;

      if (video && canvas && video.readyState >= 2) {
        const frame = drawVideoFrame(video, canvas);
        const landmarker = faceLandmarkerRef.current;

        if (
          landmarker &&
          video.currentTime !== lastVideoTime &&
          timestamp - lastDetectionTime >= 32
        ) {
          try {
            latestResults = landmarker.detectForVideo(video, timestamp);
            lastVideoTime = video.currentTime;
            lastDetectionTime = timestamp;
          } catch (error) {
            console.warn("Face Landmarker frame failed", error);
          }
        }

        const detectedLandmarks = latestResults?.faceLandmarks?.[0];
        if (detectedLandmarks) {
          missingFaceFrames = 0;
          smoothedLandmarksRef.current = smoothFaceLandmarks(
            smoothedLandmarksRef.current,
            detectedLandmarks
          );
          const blendshapes = Object.fromEntries(
            (latestResults.faceBlendshapes?.[0]?.categories || []).map((category) => [
              category.categoryName,
              category.score,
            ])
          );
          if (!isThreeEffect(effectRef.current)) {
            renderFaceEffect(
              frame.ctx,
              smoothedLandmarksRef.current,
              frame.width,
              frame.height,
              effectRef.current,
              blendshapes,
              timestamp
            );
          }
          threeRenderer?.render(
            smoothedLandmarksRef.current,
            frame.width,
            frame.height,
            effectRef.current
          );
        } else {
          missingFaceFrames += 1;
          if (missingFaceFrames > 8) smoothedLandmarksRef.current = null;
          if (missingFaceFrames > 2) threeRenderer?.clear();
        }
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    }

    async function createFaceLandmarker(vision, delegate) {
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_URL,
          delegate,
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (threeCanvasRef.current) {
          try {
            threeRendererRef.current = new ARSelfie3DRenderer(threeCanvasRef.current);
          } catch (webglError) {
            console.warn("WebGL AR effects unavailable", webglError);
            threeRendererRef.current = null;
          }
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        animationRef.current = requestAnimationFrame(renderLoop);
        setStatus("正在載入高精度臉部追蹤...");

        const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
        try {
          faceLandmarkerRef.current = await createFaceLandmarker(vision, "GPU");
        } catch (gpuError) {
          console.warn("MediaPipe GPU delegate unavailable, using CPU", gpuError);
          faceLandmarkerRef.current = await createFaceLandmarker(vision, "CPU");
        }

        if (mounted) setStatus("左右滑動選擇濾鏡與特效，按下快門拍照。");
      } catch (error) {
        console.error("AR 自拍啟動失敗", error);
        if (mounted) setStatus("無法啟動 AR 相機，請確認相機權限與網路連線。");
      }
    }

    start();
    return () => {
      mounted = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      faceLandmarkerRef.current?.close?.();
      faceLandmarkerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      smoothedLandmarksRef.current = null;
      threeRendererRef.current?.dispose();
      threeRendererRef.current = null;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

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
    setStatus("正在套用效果並儲存照片...");
    try {
      const snapshot = createFilteredSnapshot(canvas, threeCanvasRef.current, filterId);
      const response = await fetch(`${BACKEND_URL}/api/users/${user.id}/ar-selfies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: snapshot.toDataURL("image/jpeg", 0.82),
          thumbnail: createSelfieThumbnail(snapshot),
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
        <canvas ref={threeCanvasRef} className="ar-selfie-three-canvas" aria-hidden="true" />
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
            {AR_SELFIE_EFFECTS.map((effect) => (
              <button
                key={effect.id}
                type="button"
                role="radio"
                aria-checked={effectId === effect.id}
                className={`ar-selfie-option ar-selfie-effect-option${effectId === effect.id ? " is-selected" : ""}${isThreeEffect(effect.id) ? " is-3d" : ""}`}
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
