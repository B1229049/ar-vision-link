import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import "../styles/Camera.css";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const BACKEND_URL = "https://ar-vision-link.onrender.com";

let backendReadyPromise = null;

async function setupFaceApiBackend() {
  if (backendReadyPromise) return backendReadyPromise;

  backendReadyPromise = (async () => {
    const tf = await import("@tensorflow/tfjs");
    await import("@tensorflow/tfjs-backend-webgl");
    const wasm = await import("@tensorflow/tfjs-backend-wasm");

    const wasmBasePath = import.meta.env.BASE_URL || "/";
    wasm.setWasmPaths(wasmBasePath);

    try {
      await tf.setBackend("webgl");
      await tf.ready();
      const test = tf.tensor1d([1]);
      test.dispose();
      console.log("[tf] backend:", tf.getBackend());
      return;
    } catch (webglErr) {
      console.warn("[tf] WebGL 不可用，改用 WASM：", webglErr);
    }

    try {
      await tf.setBackend("wasm");
      await tf.ready();
      const test = tf.tensor1d([1]);
      test.dispose();
      console.log("[tf] backend:", tf.getBackend());
      return;
    } catch (wasmErr) {
      console.warn("[tf] WASM 不可用，改用 CPU：", wasmErr);
    }

    await tf.setBackend("cpu");
    await tf.ready();
    console.log("[tf] backend:", tf.getBackend());
  })();

  return backendReadyPromise;
}

async function loadCommonFaceApiModels() {
  await setupFaceApiBackend();

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const mediaPipeCameraRef = useRef(null);
  const modelsReadyRef = useRef(false);
  const recognizingRef = useRef(false);
  const lastRecognizeTimeRef = useRef(0);
  const latestLandmarksRef = useRef([]);

  const [modelsReady, setModelsReady] = useState(false);
  const [trackedFaces, setTrackedFaces] = useState([]);
  const [openedIds, setOpenedIds] = useState({});
  const [recognizeStatus, setRecognizeStatus] = useState("等待辨識");

  const RECOGNIZE_INTERVAL_MS = 1200;

  useEffect(() => {
    init();

    return () => {
      cleanup();
    };
  }, []);

  async function init() {
    await loadFaceApiModels();
    await startFaceMesh();
  }

  async function loadFaceApiModels() {
    try {
      await loadCommonFaceApiModels();

      modelsReadyRef.current = true;
      setModelsReady(true);

      console.log("[face-api] 模型載入完成");
    } catch (err) {
      console.error("[face-api] 模型載入失敗：", err);
      alert("face-api 模型載入失敗");
    }
  }

  async function startFaceMesh() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (!window.FaceMesh || !window.Camera) {
      alert("MediaPipe 尚未載入，請確認 index.html 有加入 script");
      return;
    }

    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const faceMesh = new window.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 8,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults(async (results) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const landmarksList = results.multiFaceLandmarks || [];
      latestLandmarksRef.current = landmarksList;

      if (landmarksList.length === 0) {
        setTrackedFaces([]);
        setOpenedIds({});
        setRecognizeStatus("畫面中沒有偵測到人臉");
        return;
      }

      const now = Date.now();

      if (
        modelsReadyRef.current &&
        now - lastRecognizeTimeRef.current > RECOGNIZE_INTERVAL_MS
      ) {
        lastRecognizeTimeRef.current = now;
        await recognizeMultiFaces();
      }
    });

    const camera = new window.Camera(video, {
      onFrame: async () => {
        if (video.readyState >= 2) {
          await faceMesh.send({ image: video });
        }
      },
      width: 1280,
      height: 720,
    });

    mediaPipeCameraRef.current = camera;
    camera.start();
  }

  async function recognizeBatch(descriptors) {
    const response = await fetch(`${BACKEND_URL}/api/face-recognize-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        descriptors: descriptors.map((d) => Array.from(d)),
      }),
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("後端回傳不是 JSON");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Batch 辨識失敗");
    }

    return result.results || [];
  }

  async function recognizeMultiFaces() {
    if (recognizingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarksList = latestLandmarksRef.current;

    if (!video || !canvas || video.readyState < 2) return;
    if (!landmarksList.length) return;

    recognizingRef.current = true;
    setRecognizeStatus("辨識中...");

    try {
      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.4,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections.length) {
        setTrackedFaces([]);
        setRecognizeStatus("face-api 沒有偵測到人臉");
        return;
      }

      const descriptors = detections.map((det) => det.descriptor);

      let recognizeResults = [];

      try {
        recognizeResults = await recognizeBatch(descriptors);
      } catch (err) {
        console.error("[recognizeBatch] 失敗：", err);
        setRecognizeStatus("後端 Batch 辨識失敗，請確認 server.js API");
        return;
      }

      const videoW = video.videoWidth || 1280;
      const videoH = video.videoHeight || 720;

      const usedMeshes = new Set();
      const backendResults = [];

      for (let detIndex = 0; detIndex < detections.length; detIndex++) {
        const det = detections[detIndex];
        const result = recognizeResults[detIndex];

        if (!result?.user) continue;
        if (Number(result.distance) > 0.45) continue;

        const box = det.detection.box;

        const faceCx = (box.x + box.width / 2) / videoW;
        const faceCy = (box.y + box.height / 2) / videoH;

        let bestMeshIndex = -1;
        let bestMeshDistance = Infinity;

        landmarksList.forEach((landmarks, index) => {
          if (usedMeshes.has(index)) return;

          const nose = landmarks[1];

          const dx = nose.x - faceCx;
          const dy = nose.y - faceCy;
          const dist = dx * dx + dy * dy;

          if (dist < bestMeshDistance) {
            bestMeshDistance = dist;
            bestMeshIndex = index;
          }
        });

        if (bestMeshIndex === -1) continue;

        usedMeshes.add(bestMeshIndex);

        const landmarks = landmarksList[bestMeshIndex];

        const forehead = landmarks[10];
        const chin = landmarks[152];

        const headHeight = (chin.y - forehead.y) * canvas.height;

        backendResults.push({
          id: `${result.user.id}-${detIndex}`,
          userId: result.user.id,
          user: result.user,
          distance: result.distance,
          x: forehead.x * canvas.width,
          y: forehead.y * canvas.height - headHeight * 0.7,
        });
      }

      const uniqueResults = [];
      const usedUserIds = new Set();

      for (const item of backendResults) {
        if (usedUserIds.has(item.userId)) continue;

        usedUserIds.add(item.userId);
        uniqueResults.push(item);
      }

      setTrackedFaces(uniqueResults);

      setOpenedIds((prev) => {
        const next = {};

        uniqueResults.forEach((face) => {
          if (prev[face.id]) {
            next[face.id] = true;
          }
        });

        return next;
      });

      setRecognizeStatus(
        uniqueResults.length > 0
          ? `已辨識 ${uniqueResults.length} 人`
          : "沒有符合的使用者"
      );
    } catch (err) {
      console.error("[recognizeMultiFaces] 失敗：", err);
      setRecognizeStatus("辨識失敗，請確認後端是否啟動");
    } finally {
      recognizingRef.current = false;
    }
  }

  function openChest(id) {
    setOpenedIds((prev) => ({
      ...prev,
      [id]: true,
    }));
  }

  function closeNameplate(id) {
    setOpenedIds((prev) => ({
      ...prev,
      [id]: false,
    }));
  }

  function formatDate(dateString) {
    if (!dateString) return "無";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "無";

    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function cleanup() {
    if (mediaPipeCameraRef.current) {
      try {
        mediaPipeCameraRef.current.stop();
      } catch (e) {
        console.warn("MediaPipe camera stop failed:", e);
      }

      mediaPipeCameraRef.current = null;
    }

    const video = videoRef.current;

    if (video) {
      const stream = video.srcObject;

      if (stream && typeof stream.getTracks === "function") {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");

      ctx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }

    latestLandmarksRef.current = [];
    recognizingRef.current = false;

    setTrackedFaces([]);
    setOpenedIds({});
  }

  return (
    <div className="camera-page">
      <video ref={videoRef} autoPlay playsInline muted className="video" />

      <canvas ref={canvasRef} className="canvas" />

      {trackedFaces.map((face) => (
        <div
          key={face.id}
          className="user-tag"
          style={{
            left: `${face.x}px`,
            top: `${face.y}px`,
          }}
        >
          {!openedIds[face.id] && (
            <button
              className="treasure-chest"
              onClick={() => openChest(face.id)}
            >
              <img
                src={`${import.meta.env.BASE_URL}chest.png`}
                className="chest-img"
                alt="chest"
              />
            </button>
          )}

          {openedIds[face.id] && (
            <div
              className="nameplate nameplate-show"
              onClick={() => closeNameplate(face.id)}
            >
              <div className="name">{face.user.name || "未命名"}</div>

              <div className="nickname">
                @{face.user.nickname || "unknown"}
              </div>

              <div className="description">
                {face.user.description || "尚無介紹"}
              </div>

              <div className="extra-info">
                {face.user.extra_info || "無額外資訊"}
              </div>

              <div className="time-info">
                建立：{formatDate(face.user.created_at)}
              </div>

              <div className="time-info">
                更新：{formatDate(face.user.updated_at)}
              </div>

              <div className="distance-info">
                距離：{Number(face.distance).toFixed(3)}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="status-panel">
        {modelsReady ? "模型已載入" : "模型載入中..."}
        <br />
        後端辨識：Batch 已啟用
        <br />
        狀態：{recognizeStatus}
        <br />
        辨識人數：{trackedFaces.length}

        <button
          className="reload-users-btn"
          onClick={recognizeMultiFaces}
          disabled={!modelsReady}
        >
          重新辨識
        </button>
      </div>
    </div>
  );
}

export default Camera;