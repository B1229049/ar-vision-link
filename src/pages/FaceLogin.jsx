import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "@vladmandic/face-api";
import "../styles/FaceLogin.css";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

const REQUIRED_SAMPLES = 3;
const MAX_CAPTURE_ATTEMPTS = 5;
const MIN_DETECTION_SCORE = 0.7;
const MIN_FACE_SIZE = 110;
const SAMPLE_INTERVAL_MS = 120;

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

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function averageAndNormalizeDescriptors(descriptors) {
  if (!descriptors.length) return null;

  const length = descriptors[0].length;
  const average = new Float32Array(length);

  for (const descriptor of descriptors) {
    if (descriptor.length !== length) return null;

    for (let i = 0; i < length; i += 1) {
      average[i] += descriptor[i];
    }
  }

  let squaredLength = 0;

  for (let i = 0; i < length; i += 1) {
    average[i] /= descriptors.length;
    squaredLength += average[i] * average[i];
  }

  const vectorLength = Math.sqrt(squaredLength);

  if (!Number.isFinite(vectorLength) || vectorLength === 0) {
    return null;
  }

  return Array.from(average, (value) => value / vectorLength);
}

function FaceLogin() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const navigate = useNavigate();

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [loginStatus, setLoginStatus] = useState("尚未登入");
  const [loggingIn, setLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setLoginStatus(`已自動登入：${user.name}`);

      const pendingRedirect = localStorage.getItem("pendingRedirect");

      if (pendingRedirect) {
        localStorage.removeItem("pendingRedirect");
        navigate(pendingRedirect);
      }
    } else {
      init();
    }

    return () => {
      stopCamera();
    };
  }, []);

  async function init() {
    setLoginStatus("正在準備臉部辨識...");

    const [modelLoaded, cameraStarted] = await Promise.all([
      loadModels(),
      startCamera(),
    ]);

    if (modelLoaded && cameraStarted) {
      setLoginStatus("準備完成，請面對鏡頭");
    }
  }

  async function loadModels() {
    try {
      await loadCommonFaceApiModels();
      setModelsReady(true);
      console.log("face-api 模型載入完成");
      return true;
    } catch (err) {
      console.error(err);
      setLoginStatus("臉部模型載入失敗，請重新整理後再試");
      return false;
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        await new Promise((resolve) => {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            resolve();
            return;
          }

          video.addEventListener("loadeddata", resolve, { once: true });
        });

        await video.play();
      }

      setCameraReady(true);
      return true;
    } catch (err) {
      console.error(err);
      setLoginStatus("無法開啟相機，請檢查瀏覽器權限");
      return false;
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

    setCameraReady(false);
  }

  async function captureStableDescriptor(video) {
    const descriptors = [];

    for (
      let attempt = 0;
      attempt < MAX_CAPTURE_ATTEMPTS && descriptors.length < REQUIRED_SAMPLES;
      attempt += 1
    ) {
      const detection = await faceapi
        .detectSingleFace(video, DETECTOR_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const { score, box } = detection.detection;
        const faceIsLargeEnough =
          box.width >= MIN_FACE_SIZE && box.height >= MIN_FACE_SIZE;

        if (score >= MIN_DETECTION_SCORE && faceIsLargeEnough) {
          descriptors.push(detection.descriptor);
          setLoginStatus(
            `正在確認臉部... ${descriptors.length}/${REQUIRED_SAMPLES}`
          );
        } else if (!faceIsLargeEnough) {
          setLoginStatus("請靠近鏡頭一點，並保持臉部清楚");
        } else {
          setLoginStatus("請正對鏡頭並保持不動");
        }
      } else {
        setLoginStatus("偵測不到臉，請面對鏡頭");
      }

      if (descriptors.length < REQUIRED_SAMPLES) {
        await delay(SAMPLE_INTERVAL_MS);
      }
    }

    if (descriptors.length < REQUIRED_SAMPLES) {
      return null;
    }

    return averageAndNormalizeDescriptors(descriptors);
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

    setLoggingIn(true);
    setLoginStatus("辨識中...");

    try {
      const video = videoRef.current;

      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setLoginStatus("相機畫面尚未準備完成，請稍後再試");
        return;
      }

      const descriptor = await captureStableDescriptor(video);

      if (!descriptor) {
        setLoginStatus("無法取得穩定的臉部影像，請調整光線後再試");
        return;
      }

      setLoginStatus("正在比對身分...");

      const response = await fetch(`${BACKEND_URL}/api/face-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          descriptor,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setLoginStatus(result?.error || "登入失敗：找不到符合的使用者");
        return;
      }

      const loginUser = result.user;

      localStorage.setItem("currentUser", JSON.stringify(loginUser));

      setCurrentUser(loginUser);
      setLoginStatus(`登入成功：${loginUser.name}`);

      stopCamera();

      setTimeout(() => {
        const pendingRedirect = localStorage.getItem("pendingRedirect");

        if (pendingRedirect) {
          localStorage.removeItem("pendingRedirect");
          navigate(pendingRedirect);
          return;
        }

        navigate("/profile");
      }, 800);
    } catch (err) {
      console.error(err);
      setLoginStatus("登入過程發生錯誤，請確認網路後重試");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setLoginStatus("已登出");

    if (!modelsReady) init();
    else startCamera().then((started) => {
      if (started) setLoginStatus("準備完成，請面對鏡頭");
    });
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
              disabled={loggingIn || !modelsReady || !cameraReady}
            >
              {loggingIn
                ? "辨識中..."
                : modelsReady && cameraReady
                  ? "開始臉部登入"
                  : "準備中..."}
            </button>
          </>
        )}

        {currentUser && (
          <div className="user-info">
            <h3>{currentUser.name}</h3>
            <p>{currentUser.description || "尚無介紹"}</p>

            <button className="login-btn" onClick={() => navigate("/profile")}>
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
