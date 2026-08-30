import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  AR_SELFIE_EFFECTS,
  createFilteredSnapshot,
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
  const effectRef = useRef("none");
  const threeRendererRef = useRef(null);
  const capturedPhotoRef = useRef(null);
  const filterRowRef = useRef(null);
  const effectRowRef = useRef(null);
  const scrollEndTimerRef = useRef(null);

  const [filterId, setFilterId] = useState("natural");
  const [effectId, setEffectId] = useState("none");
  const [activePicker, setActivePicker] = useState(null);
  const [status, setStatus] = useState("正在啟動相機...");
  const [capturing, setCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

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
            width: { ideal: 900 },
            height: { ideal: 1200 },
            aspectRatio: { ideal: 0.75 },
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

        if (mounted) setStatus("點選色調或特效，左右滑動選擇後按下快門。");
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
      if (capturedPhotoRef.current?.url) {
        URL.revokeObjectURL(capturedPhotoRef.current.url);
        capturedPhotoRef.current = null;
      }
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (!activePicker) return undefined;

    const row = activePicker === "filter" ? filterRowRef.current : effectRowRef.current;
    const selectedId = activePicker === "filter" ? filterId : effectId;
    const frameId = requestAnimationFrame(() => {
      const selectedOption = Array.from(row?.querySelectorAll("[data-option-id]") || [])
        .find((option) => option.dataset.optionId === selectedId);
      centerSelectedOption(selectedOption, "auto");
    });

    return () => cancelAnimationFrame(frameId);
  }, [activePicker, effectId, filterId]);

  function centerSelectedOption(element, behavior = "smooth") {
    element?.scrollIntoView({ behavior, block: "nearest", inline: "center" });
  }

  function selectFilter(filter, element, shouldCenter = true) {
    setFilterId(filter.id);
    if (shouldCenter) centerSelectedOption(element);
  }

  function selectEffect(effect, element, shouldCenter = true) {
    effectRef.current = effect.id;
    setEffectId(effect.id);
    if (shouldCenter) centerSelectedOption(element);
  }

  function selectCenteredOption(row, options, type) {
    const rowRect = row.getBoundingClientRect();
    const rowCenter = rowRect.left + rowRect.width / 2;
    const optionElements = Array.from(row.querySelectorAll("[data-option-id]"));
    const centeredElement = optionElements.reduce((closest, option) => {
      if (!closest) return option;
      const optionRect = option.getBoundingClientRect();
      const closestRect = closest.getBoundingClientRect();
      const optionDistance = Math.abs(optionRect.left + optionRect.width / 2 - rowCenter);
      const closestDistance = Math.abs(closestRect.left + closestRect.width / 2 - rowCenter);
      return optionDistance < closestDistance ? option : closest;
    }, null);

    const centeredOption = options.find(
      (option) => option.id === centeredElement?.dataset.optionId
    );
    if (!centeredOption) return;

    if (type === "filter") selectFilter(centeredOption, null, false);
    else selectEffect(centeredOption, null, false);
  }

  function handleOptionScroll(event, options, type) {
    const row = event.currentTarget;
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      selectCenteredOption(row, options, type);
    }, 90);
  }

  async function captureSelfie() {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width || capturing || capturedPhoto) return;

    setCapturing(true);
    setStatus("正在建立自拍預覽...");
    try {
      const snapshot = createFilteredSnapshot(
        canvas,
        threeCanvasRef.current,
        filterId,
        3 / 4
      );
      const blob = await new Promise((resolve, reject) => {
        snapshot.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("無法建立自拍照片"));
        }, "image/jpeg", 0.92);
      });
      const photo = { blob, url: URL.createObjectURL(blob) };
      capturedPhotoRef.current = photo;
      setCapturedPhoto(photo);
      setStatus("請確認照片，選擇取消或儲存到裝置。");
    } catch (error) {
      setStatus(error.message || "自拍建立失敗，請再試一次。");
    } finally {
      setCapturing(false);
    }
  }

  function cancelCapturedPhoto() {
    if (capturedPhotoRef.current?.url) {
      URL.revokeObjectURL(capturedPhotoRef.current.url);
    }
    capturedPhotoRef.current = null;
    setCapturedPhoto(null);
    setStatus("點選色調或特效，左右滑動選擇後按下快門。");
  }

  function savePhotoToDevice() {
    const photo = capturedPhotoRef.current;
    if (!photo) return;

    const link = document.createElement("a");
    link.href = photo.url;
    link.download = `ar-selfie-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    capturedPhotoRef.current = null;
    setCapturedPhoto(null);
    setStatus("照片已儲存到裝置。");
    setTimeout(() => URL.revokeObjectURL(photo.url), 1500);
  }

  const activeFilter = FILTERS.find((filter) => filter.id === filterId)?.value || "none";
  const selectedFilterLabel = FILTERS.find((filter) => filter.id === filterId)?.label || "自然";
  const selectedEffectLabel = AR_SELFIE_EFFECTS.find((effect) => effect.id === effectId)?.label || "無特效";

  return (
    <main className="ar-selfie-page">
      <header className="ar-selfie-topbar">
        <button
          className="ar-selfie-close"
          type="button"
          onClick={() => navigate("/camera")}
          aria-label="關閉 AR 自拍"
        >
          <span aria-hidden="true" />
        </button>
      </header>

      <div className="ar-selfie-stage">
        <section className="ar-selfie-viewfinder" aria-label="AR 自拍預覽">
          <video ref={videoRef} className="ar-selfie-video" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="ar-selfie-canvas" style={{ filter: activeFilter }} />
          <canvas ref={threeCanvasRef} className="ar-selfie-three-canvas" aria-hidden="true" />
          <p className="ar-selfie-status">{status}</p>
        </section>
      </div>

      <section className="ar-selfie-controls">
        <div className="ar-selfie-picker-area">
          {activePicker === "filter" && (
            <div
              ref={filterRowRef}
              className="ar-selfie-control-row"
              role="radiogroup"
              aria-label="選擇色調"
              onScroll={(event) => handleOptionScroll(event, FILTERS, "filter")}
            >
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  data-option-id={filter.id}
                  type="button"
                  role="radio"
                  aria-checked={filterId === filter.id}
                  className={`ar-selfie-option${filterId === filter.id ? " is-selected" : ""}`}
                  onClick={(event) => selectFilter(filter, event.currentTarget)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {activePicker === "effect" && (
            <div
              ref={effectRowRef}
              className="ar-selfie-control-row"
              role="radiogroup"
              aria-label="選擇特效"
              onScroll={(event) => handleOptionScroll(event, AR_SELFIE_EFFECTS, "effect")}
            >
              {AR_SELFIE_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  data-option-id={effect.id}
                  type="button"
                  role="radio"
                  aria-checked={effectId === effect.id}
                  className={`ar-selfie-option${effectId === effect.id ? " is-selected" : ""}`}
                  onClick={(event) => selectEffect(effect, event.currentTarget)}
                >
                  {effect.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ar-selfie-capture-actions">
          <button
            className={`ar-selfie-mode-button${activePicker === "filter" ? " is-active" : ""}`}
            type="button"
            aria-expanded={activePicker === "filter"}
            onClick={() => setActivePicker((current) => current === "filter" ? null : "filter")}
          >
            <strong>色調</strong>
            <span>{selectedFilterLabel}</span>
          </button>
          <button className="ar-selfie-shutter" type="button" onClick={captureSelfie} disabled={capturing} aria-label="拍攝 AR 自拍"><span /></button>
          <button
            className={`ar-selfie-mode-button${activePicker === "effect" ? " is-active" : ""}`}
            type="button"
            aria-expanded={activePicker === "effect"}
            onClick={() => setActivePicker((current) => current === "effect" ? null : "effect")}
          >
            <strong>特效</strong>
            <span>{selectedEffectLabel}</span>
          </button>
        </div>
      </section>

      {capturedPhoto && (
        <section className="ar-selfie-confirm" role="dialog" aria-modal="true" aria-label="確認 AR 自拍">
          <div className="ar-selfie-confirm-card">
            <img src={capturedPhoto.url} alt="剛拍攝的 AR 自拍預覽" />
            <p>要儲存這張照片嗎？</p>
            <div className="ar-selfie-confirm-actions">
              <button type="button" className="cancel" onClick={cancelCapturedPhoto}>取消</button>
              <button type="button" className="save" onClick={savePhotoToDevice}>儲存到裝置</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default ARSelfie;
