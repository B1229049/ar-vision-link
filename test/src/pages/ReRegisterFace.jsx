import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "@vladmandic/face-api";
import "../styles/ReRegisterFace.css";

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


function ReRegisterFace() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [mode, setMode] = useState("idle");
  const [capturedImage, setCapturedImage] = useState(null);
  const [updating, setUpdating] = useState(false);

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
    loadModels();

    return () => {
      stopCamera();
    };
  }, [navigate]);

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

      setCapturedImage(null);
      setMode("preview");
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

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = 640;
    canvas.height = 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 640, 480);

    const imageData = canvas.toDataURL("image/png");

    setCapturedImage(imageData);
    setMode("captured");

    stopCamera();
  }

  function handleCameraButton() {
    if (mode === "idle") {
      startCamera();
    } else if (mode === "preview") {
      takePhoto();
    } else if (mode === "captured") {
      startCamera();
    }
  }

  function handleUploadPhoto(e) {
    const file = e.target.files[0];

    if (!file) return;

    stopCamera();

    const imageUrl = URL.createObjectURL(file);

    setCapturedImage(imageUrl);
    setMode("captured");
  }

  async function handleUpdateFace() {
    if (!currentUser) {
      alert("尚未登入");
      return;
    }

    if (!capturedImage) {
      alert("請先拍照或上傳照片");
      return;
    }

    if (!modelsReady) {
      alert("臉部模型尚未載入完成");
      return;
    }

    setUpdating(true);

    try {
      const img = new Image();
      img.src = capturedImage;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.4,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        alert("偵測不到臉，請重新拍攝或上傳清楚照片");
        setUpdating(false);
        return;
      }

      const embedding = Array.from(detection.descriptor).map(Number);

      const response = await fetch(`${BACKEND_URL}/api/users/${currentUser.id}/face`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          face_embedding: embedding,
          avatar_url: capturedImage,
        }),
      });

      const text = await response.text();

      let result;

      try {
        result = JSON.parse(text);
      } catch {
        console.error("後端回傳不是 JSON：", text);
        alert("後端 API 錯誤或尚未部署成功");
        setUpdating(false);
        return;
      }

      if (!response.ok || result.error) {
        alert("更新臉部資料失敗：" + (result.error || "未知錯誤"));
        setUpdating(false);
        return;
      }

      const updatedUser = {
        ...currentUser,
        ...result.user,
      };

      delete updatedUser.face_embedding;

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      alert("臉部資料更新成功！");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      alert("更新臉部資料時發生錯誤：" + err.message);
    }

    setUpdating(false);
  }

  if (!currentUser) {
    return (
      <div className="re-face-page">
        <div className="re-face-card">
          <p>載入使用者資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="re-face-page">
      <div className="re-face-card">
        <h2>重新註冊臉部</h2>

        <p className="re-face-subtitle">
          目前使用者：{currentUser.name || "未命名"}
        </p>

        <div className="re-face-preview">
          {mode === "idle" && (
            <div className="re-face-placeholder">
              尚未拍照或上傳照片
            </div>
          )}

          <video
            ref={videoRef}
            className={mode === "preview" ? "re-face-media-show" : "re-face-media-hide"}
            autoPlay
            playsInline
            muted
          />

          {mode === "captured" && capturedImage && (
            <img
              src={capturedImage}
              className="re-face-media-show"
              alt="captured"
            />
          )}

          <canvas ref={canvasRef} className="re-face-media-hide" />
        </div>

        <div className="re-face-hint">
          {modelsReady
            ? "臉部模型已載入，可以拍照或上傳照片"
            : "臉部模型載入中..."}
        </div>

        <button className="re-face-btn secondary" onClick={handleCameraButton}>
          {mode === "preview"
            ? "拍照"
            : mode === "captured"
            ? "重新拍攝"
            : "開啟相機"}
        </button>

        <label className="re-face-upload-label">
          選擇照片上傳
          <input
            type="file"
            accept="image/*"
            onChange={handleUploadPhoto}
            className="re-face-upload-input"
          />
        </label>

        <button
          className="re-face-btn primary"
          onClick={handleUpdateFace}
          disabled={updating}
        >
          {updating ? "更新中..." : "更新臉部資料"}
        </button>

        <button
          className="re-face-btn secondary"
          onClick={() => navigate("/profile")}
        >
          返回個人頁面
        </button>
      </div>
    </div>
  );
}

export default ReRegisterFace;
