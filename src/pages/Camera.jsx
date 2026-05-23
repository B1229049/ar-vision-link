import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import "../styles/Camera.css";

function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const mediaPipeCameraRef = useRef(null);
  const userCacheRef = useRef([]);
  const modelsReadyRef = useRef(false);
  const recognizingRef = useRef(false);
  const lastRecognizeTimeRef = useRef(0);
  const latestLandmarksRef = useRef([]);

  const [modelsReady, setModelsReady] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [trackedFaces, setTrackedFaces] = useState([]);
  const [openedIds, setOpenedIds] = useState({});
  const [isReloadingUsers, setIsReloadingUsers] = useState(false);

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const MATCH_THRESHOLD = 0.85;
  const RECOGNIZE_INTERVAL_MS = 900;

  useEffect(() => {
    init();

    return () => cleanup();
  }, []);

  async function init() {
    await loadFaceApiModels();
    await loadUserCache();
    await startFaceMesh();
  }

  async function loadFaceApiModels() {
    try {
      const MODEL_URL =
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsReadyRef.current = true;
      setModelsReady(true);
      console.log("[face-api] 模型載入完成");
    } catch (err) {
      console.error("[face-api] 模型載入失敗：", err);
      alert("face-api 模型載入失敗");
    }
  }

  async function loadUserCache() {
    setIsReloadingUsers(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/users`);
      const result = await response.json();

      if (!response.ok) {
        console.error(result);
        alert("載入使用者失敗：" + (result.error || "未知錯誤"));
        setIsReloadingUsers(false);
        return;
      }

      const data = result.users || [];

      const users = data
        .map((u) => {
          let embedding = u.face_embedding;

          if (typeof embedding === "string") {
            try {
              embedding = JSON.parse(embedding);
            } catch {
              console.warn(`[backend] ${u.name} embedding JSON 解析失敗`);
              return null;
            }
          }

          if (!Array.isArray(embedding) || embedding.length === 0) {
            console.warn(`[backend] ${u.name} 沒有有效 embedding`);
            return null;
          }

          return {
            ...u,
            embedding: new Float32Array(embedding),
          };
        })
        .filter(Boolean);

      userCacheRef.current = users;
      setUserCount(users.length);

      console.log("[backend] user cache:", users.length);
    } catch (err) {
      console.error("[backend] 載入使用者失敗：", err);
      alert("載入使用者失敗，請確認 Render 後端是否啟動");
    }

    setIsReloadingUsers(false);
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
      maxNumFaces: 5,
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

  async function recognizeMultiFaces() {
    if (recognizingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const users = userCacheRef.current;
    const landmarksList = latestLandmarksRef.current;

    if (!video || !canvas || video.readyState < 2) return;
    if (!users.length || !landmarksList.length) return;

    recognizingRef.current = true;

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
        return;
      }

      const videoW = video.videoWidth || 1280;
      const videoH = video.videoHeight || 720;

      const results = [];
      const usedUsers = new Set();
      const usedMeshes = new Set();

      detections.forEach((det, detIndex) => {
        let bestUser = null;
        let bestDistance = Infinity;

        users.forEach((user) => {
          if (usedUsers.has(user.id)) return;

          if (!user.embedding || user.embedding.length !== det.descriptor.length) {
            return;
          }

          const distance = faceapi.euclideanDistance(
            det.descriptor,
            user.embedding
          );

          console.log(
            `[debug] detection ${detIndex} vs ${user.name}: ${distance.toFixed(
              3
            )}`
          );

          if (distance < bestDistance) {
            bestDistance = distance;
            bestUser = user;
          }
        });

        console.log(
          `[best] detection ${detIndex}:`,
          bestUser?.name,
          bestDistance
        );

        if (!bestUser || bestDistance >= MATCH_THRESHOLD) return;

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

        if (bestMeshIndex === -1) return;

        const landmarks = landmarksList[bestMeshIndex];
        const forehead = landmarks[10];
        const chin = landmarks[152];

        const headHeight = (chin.y - forehead.y) * canvas.height;

        results.push({
          id: bestUser.id,
          user: bestUser,
          distance: bestDistance,
          x: forehead.x * canvas.width,
          y: forehead.y * canvas.height - headHeight * 0.7,
        });

        usedUsers.add(bestUser.id);
        usedMeshes.add(bestMeshIndex);
      });

      setTrackedFaces(results);

      setOpenedIds((prev) => {
        const next = {};
        results.forEach((face) => {
          if (prev[face.id]) {
            next[face.id] = true;
          }
        });
        return next;
      });

      console.log(
        "[multi match]",
        results.map((r) => `${r.user.name}: ${r.distance.toFixed(3)}`)
      );
    } catch (err) {
      console.error("[recognizeMultiFaces] 失敗：", err);
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

  function cleanup() {
    if (mediaPipeCameraRef.current) {
      mediaPipeCameraRef.current.stop();
      mediaPipeCameraRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
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
              <div className="name">{face.user.name}</div>
              <div className="nickname">
                @{face.user.nickname || "unknown"}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="status-panel">
        {modelsReady ? "模型已載入" : "模型載入中..."}
        <br />
        使用者快取：{userCount} 筆
        <br />
        辨識人數：{trackedFaces.length}

        <button
          className="reload-users-btn"
          onClick={loadUserCache}
          disabled={isReloadingUsers}
        >
          {isReloadingUsers ? "重新載入中..." : "重新載入使用者"}
        </button>
      </div>
    </div>
  );
}

export default Camera;