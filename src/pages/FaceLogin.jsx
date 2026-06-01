import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "@vladmandic/face-api";
import "../styles/FaceLogin.css";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

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


function FaceLogin() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const userCacheRef = useRef([]);

  const navigate = useNavigate();

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [loginStatus, setLoginStatus] = useState("尚未登入");
  const [loggingIn, setLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const BACKEND_URL = "https://ar-vision-link.onrender.com";
  const MATCH_THRESHOLD = 0.85;

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setLoginStatus(`已自動登入：${user.name}`);
    }

    init();

    return () => {
      stopCamera();
    };
  }, []);

  async function init() {
    await loadModels();
    await loadUsers();
    await startCamera();
  }

  async function loadModels() {
    try {
      await loadCommonFaceApiModels();

      setModelsReady(true);
      console.log("face-api 模型載入完成");
    } catch (err) {
      console.error(err);
      alert("臉部模型載入失敗");
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/face-login`);
      const result = await response.json();

      if (!response.ok || result.error) {
        alert("載入使用者失敗：" + (result.error || "未知錯誤"));
        return;
      }

      const users = (result.users || [])
        .filter((u) => u.is_active !== false)
        .map((u) => {
          let embedding = u.face_embedding;

          if (typeof embedding === "string") {
            embedding = JSON.parse(embedding);
          }

          if (!Array.isArray(embedding) || embedding.length === 0) {
            return null;
          }

          return {
            ...u,
            embedding: new Float32Array(embedding.map(Number)),
          };
        })
        .filter(Boolean);

      userCacheRef.current = users;
      setUsersLoaded(true);

      console.log("已載入使用者：", users.length);
    } catch (err) {
      console.error(err);
      alert("載入使用者失敗，請確認後端是否啟動");
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraReady(true);
    } catch (err) {
      console.error(err);
      alert("無法開啟相機，請檢查權限");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function handleFaceLogin() {
    if (!modelsReady) {
      alert("模型尚未載入完成");
      return;
    }

    if (!cameraReady) {
      alert("相機尚未開啟");
      return;
    }

    if (!usersLoaded || userCacheRef.current.length === 0) {
      alert("尚未載入使用者資料");
      return;
    }

    setLoggingIn(true);
    setLoginStatus("辨識中...");

    try {
      const video = videoRef.current;

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
        setLoginStatus("偵測不到臉，請面對鏡頭");
        setLoggingIn(false);
        return;
      }

      let bestUser = null;
      let bestDistance = Infinity;

      userCacheRef.current.forEach((user) => {
        if (!user.embedding) return;

        const distance = faceapi.euclideanDistance(
          detection.descriptor,
          user.embedding
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestUser = user;
        }
      });

      if (!bestUser || bestDistance >= MATCH_THRESHOLD) {
        setLoginStatus("登入失敗：找不到符合的使用者");
        setLoggingIn(false);
        return;
      }

      const loginUser = {
        id: bestUser.id,
        name: bestUser.name,
        nickname: bestUser.nickname,
        description: bestUser.description,
        extra_info: bestUser.extra_info,
        is_active: bestUser.is_active,
        created_at: bestUser.created_at,
        updated_at: bestUser.updated_at,
        avatar_url: bestUser.avatar_url,
      };

      localStorage.setItem("currentUser", JSON.stringify(loginUser));

      setCurrentUser(loginUser);
      setLoginStatus(`登入成功：${loginUser.name}`);

      stopCamera();

      setTimeout(() => {
        navigate("/profile");
      }, 800);
    } catch (err) {
      console.error(err);
      setLoginStatus("登入過程發生錯誤");
    }

    setLoggingIn(false);
  }

  function logout() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setLoginStatus("已登出");
    startCamera();
  }

  return (
    <div className="face-login-page">
      <div className="face-login-card">
        <h2>臉部登入</h2>

        <p className="login-status">{loginStatus}</p>

        {!currentUser && (
          <>
            <div className="video-box">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="login-video"
              />
            </div>

            <button
              className="login-btn"
              onClick={handleFaceLogin}
              disabled={loggingIn}
            >
              {loggingIn ? "辨識中..." : "開始臉部登入"}
            </button>
          </>
        )}

        {currentUser && (
          <div className="user-info">
            <h3>{currentUser.name}</h3>
            <p>@{currentUser.nickname || "unknown"}</p>
            <p>{currentUser.description || "尚無介紹"}</p>

            <button
              className="login-btn"
              onClick={() => navigate("/profile")}
            >
              前往個人頁面
            </button>

            <button className="logout-btn" onClick={logout}>
              登出
            </button>
          </div>
        )}

        <button className="back-btn" onClick={() => navigate("/")}>
          回首頁
        </button>
      </div>
    </div>
  );
}

export default FaceLogin;
