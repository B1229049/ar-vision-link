import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import { supabase } from "../lib/supabase";
import "../styles/Camera.css";

function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chestRef = useRef(null);

  const mediaPipeCameraRef = useRef(null);
  const faceMeshRef = useRef(null);

  const userCacheRef = useRef([]);
  const recognizingRef = useRef(false);
  const lastRecognizeTimeRef = useRef(0);
  const modelsReadyRef = useRef(false);

  const [showNameplate, setShowNameplate] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [isReloadingUsers, setIsReloadingUsers] = useState(false);
  const [chestOpening, setChestOpening] = useState(false);

  const MATCH_THRESHOLD = 0.7;
  const RECOGNIZE_INTERVAL_MS = 800;

  useEffect(() => {
    init();

    return () => {
      cleanup();
    };
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
      console.error(err);
      alert("face-api 模型載入失敗");
    }
  }

  async function loadUserCache() {
    setIsReloadingUsers(true);

    const { data, error } = await supabase
      .from("users")
      .select("id, name, nickname, description, extra_info, face_embedding");

    if (error) {
      console.error("[supabase] 載入 users 失敗：", error);
      alert("重新載入使用者失敗：" + error.message);
      setIsReloadingUsers(false);
      return;
    }

    const users = (data || [])
      .map((u) => {
        let embedding = u.face_embedding;

        if (typeof embedding === "string") {
          try {
            embedding = JSON.parse(embedding);
          } catch {
            console.warn(`[supabase] ${u.name} embedding JSON 解析失敗`);
            return null;
          }
        }

        if (!Array.isArray(embedding) || embedding.length === 0) {
          console.warn(`[supabase] ${u.name} 沒有有效 embedding`);
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
    setIsReloadingUsers(false);

    console.log("[supabase] user cache:", users.length);
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
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults(async (results) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (
        !results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0
      ) {
        if (chestRef.current) {
          chestRef.current.style.display = "none";
        }

        setRecognizedUser(null);
        setShowNameplate(false);
        setChestOpening(false);
        return;
      }

      const landmarks = results.multiFaceLandmarks[0];

      const forehead = landmarks[10];
      const chin = landmarks[152];

      const headHeight = (chin.y - forehead.y) * canvas.height;

      const x = forehead.x * canvas.width;
      const y = forehead.y * canvas.height - headHeight * 0.7;

      if (chestRef.current) {
        chestRef.current.style.display = "flex";
        chestRef.current.style.left = `${x}px`;
        chestRef.current.style.top = `${y}px`;
      }

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();

      const now = Date.now();

      if (
        modelsReadyRef.current &&
        now - lastRecognizeTimeRef.current > RECOGNIZE_INTERVAL_MS
      ) {
        lastRecognizeTimeRef.current = now;
        await recognizeCurrentFace();
      }
    });

    faceMeshRef.current = faceMesh;

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

  async function recognizeCurrentFace() {
    if (recognizingRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const users = userCacheRef.current;
    if (!users.length) {
      console.warn("[recognize] userCache 為空");
      return;
    }

    recognizingRef.current = true;

    try {
      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.4,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setRecognizedUser(null);
        setShowNameplate(false);
        setChestOpening(false);
        return;
      }

      const descriptor = detection.descriptor;

      let bestUser = null;
      let bestDistance = Infinity;

      for (const user of users) {
        if (!user.embedding || user.embedding.length !== descriptor.length) {
          continue;
        }

        const distance = faceapi.euclideanDistance(descriptor, user.embedding);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestUser = user;
        }
      }

      console.log("bestUser =", bestUser?.name);
      console.log("bestDistance =", bestDistance);

      if (bestUser && bestDistance < MATCH_THRESHOLD) {
        setRecognizedUser(bestUser);
      } else {
        setRecognizedUser(null);
        setShowNameplate(false);
        setChestOpening(false);
      }
    } catch (err) {
      console.error("[recognize] 失敗：", err);
    } finally {
      recognizingRef.current = false;
    }
  }

  function openChest() {
    if (!recognizedUser) {
      alert("尚未辨識到已註冊使用者");
      return;
    }

    setChestOpening(true);

    setTimeout(() => {
      setShowNameplate(true);
    }, 220);
  }

  function closeNameplate() {
    setShowNameplate(false);
    setChestOpening(false);
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

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    if (chestRef.current) {
      chestRef.current.style.display = "none";
    }
  }

  return (
    <div className="camera-page">
      <video ref={videoRef} autoPlay playsInline muted className="video" />

      <canvas ref={canvasRef} className="canvas" />

      <div ref={chestRef} className="user-tag">
        {!showNameplate && (
          <button
            className={`treasure-chest ${chestOpening ? "chest-opening" : ""}`}
            onClick={openChest}
          >
            <img src="./chest.png" className="chest-img" alt="chest" />
          </button>
        )}

        {showNameplate && recognizedUser && (
          <div className="nameplate nameplate-show" onClick={closeNameplate}>
            <div className="name">{recognizedUser.name}</div>
            <div className="nickname">
              @{recognizedUser.nickname || "unknown"}
            </div>
          </div>
        )}
      </div>

      <div className="status-panel">
        {modelsReady ? "模型已載入" : "模型載入中..."}
        <br />
        使用者快取：{userCount} 筆
        <br />
        {recognizedUser
          ? `辨識到：${recognizedUser.name}`
          : "尚未辨識到使用者"}

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