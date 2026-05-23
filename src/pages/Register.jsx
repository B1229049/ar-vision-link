import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import { supabase } from "../lib/supabase";
import "../styles/Register.css";

function Register() {
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [description, setDescription] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraStream, setCameraStream] = useState(null);
  const [mode, setMode] = useState("idle");
  const [capturedImage, setCapturedImage] = useState(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    async function loadModels() {
      try {
        const MODEL_URL =
          "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        setModelsReady(true);
        console.log("face-api 模型載入完成");
      } catch (err) {
        console.error(err);
        alert("臉部模型載入失敗");
      }
    }

    loadModels();
  }, []);

  function goStep2() {
    if (!name.trim()) {
      alert("請先輸入姓名");
      return;
    }

    setStep(2);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraStream(stream);
      setCapturedImage(null);
      setMode("preview");
    } catch (err) {
      console.error(err);
      alert("無法開啟相機，請檢查權限");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
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

  function handleUploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    stopCamera();

    const imageUrl = URL.createObjectURL(file);

    setCapturedImage(imageUrl);
    setMode("captured");
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

  function backStep1() {
    stopCamera();
    setMode("idle");
    setCapturedImage(null);
    setStep(1);
  }

  async function handleRegister() {
    if (!capturedImage) {
      alert("請先拍照或上傳照片");
      return;
    }

    if (!modelsReady) {
      alert("臉部模型尚未載入完成，請稍候");
      return;
    }

    setRegistering(true);

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
        alert("偵測不到臉，請重新拍照或上傳清楚照片");
        setRegistering(false);
        return;
      }

      const embedding = Array.from(detection.descriptor);

      const { error } = await supabase.from("users").insert([
        {
          name,
          nickname,
          description,
          extra_info: extraInfo,
          face_embedding: embedding,
        },
      ]);

      if (error) {
        console.error(error);
        alert("註冊失敗：" + error.message);
        setRegistering(false);
        return;
      }

      alert("註冊成功！");

      stopCamera();
      setName("");
      setNickname("");
      setDescription("");
      setExtraInfo("");
      setCapturedImage(null);
      setMode("idle");
      setStep(1);
    } catch (err) {
      console.error(err);
      alert("註冊過程發生錯誤");
    }

    setRegistering(false);
  }

  return (
    <div className="register-page">
      <div className="card">
        <h2>建立新帳戶</h2>
        <div className="subtitle">請先填寫基本資料，再進行臉部註冊。</div>

        <div className="step-indicator">
          <span className={step === 1 ? "step-active" : ""}>
            STEP 1：填寫資料
          </span>
          <span className={step === 2 ? "step-active" : ""}>
            STEP 2：拍攝照片
          </span>
        </div>

        {step === 1 && (
          <>
            <div className="field">
              <label>姓名（必填）</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：陳小明"
              />
            </div>

            <div className="field">
              <label>暱稱（可選）</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Simon"
              />
            </div>

            <div className="field">
              <label>自我介紹（可選）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="簡短介紹自己"
              />
            </div>

            <div className="field">
              <label>額外資訊（可選）</label>
              <textarea
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="例如：IG / 備註"
              />
            </div>

            <button className="btn btn-primary" onClick={goStep2}>
              下一步：拍攝照片 ➜
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="preview-box">
              {mode === "idle" && (
                <div className="placeholder">尚未拍照或上傳</div>
              )}

              <video
                ref={videoRef}
                className={mode === "preview" ? "media-show" : "media-hide"}
                playsInline
                autoPlay
              />

              {mode === "captured" && capturedImage && (
                <img
                  src={capturedImage}
                  className="media-show"
                  alt="captured"
                />
              )}

              <canvas ref={canvasRef} className="media-hide" />
            </div>

            <div className="small-hint">
              {modelsReady
                ? "臉部模型已載入，可以拍照或上傳照片"
                : "臉部模型載入中..."}
            </div>

            <button className="btn btn-secondary" onClick={handleCameraButton}>
              📷{" "}
              {mode === "preview"
                ? "拍照"
                : mode === "captured"
                ? "重新拍攝"
                : "開啟相機"}
            </button>

            <label className="uploadLabel">
              📁 選擇照片上傳
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadPhoto}
                className="uploadInput"
              />
            </label>

            <button
              className="btn btn-primary"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? "註冊中..." : "完成註冊"}
            </button>

            <button className="btn btn-secondary" onClick={backStep1}>
              返回上一步
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;