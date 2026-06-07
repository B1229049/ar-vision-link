import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import "../styles/TrackedPlayerVideo.css";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let modelPromise = null;

async function loadFaceModel() {
  if (!modelPromise) {
    modelPromise = faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  }

  return modelPromise;
}

function TrackedPlayerVideo({ stream, playerName, score, result }) {
  const videoRef = useRef(null);
  const detectTimerRef = useRef(null);

  const [tagPos, setTagPos] = useState({
    x: 50,
    y: 16,
    detected: false,
  });

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    let cancelled = false;

    async function startVideo() {
      try {
        await video.play();
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") {
          console.warn(
            "remote video play failed:",
            err
          );
        }
      }
    }

    startVideo();

    return () => {
      cancelled = true;
    };
  }, [stream]);

  useEffect(() => {
    let cancelled = false;

    async function startDetect() {
      try {
        await loadFaceModel();

        if (cancelled) return;

        detectTimerRef.current = setInterval(async () => {
          const video = videoRef.current;

          if (!video || video.readyState < 2) return;

          const detection = await faceapi.detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.45,
            })
          );

          if (!detection) {
            setTagPos((prev) => ({
              ...prev,
              detected: false,
            }));
            return;
          }

          const box = detection.box;

          const videoW = video.videoWidth;
          const videoH = video.videoHeight;

          const viewW = video.clientWidth;
          const viewH = video.clientHeight;

          const scale = Math.max(viewW / videoW, viewH / videoH);
          const offsetX = (viewW - videoW * scale) / 2;
          const offsetY = (viewH - videoH * scale) / 2;

          // const rawCenterX = (box.x + box.width / 2) * scale + offsetX;
          // const centerX = viewW - rawCenterX;
          const centerX = (box.x + box.width / 2) * scale + offsetX;

          const headY = (box.y - box.height * 0.1) * scale + offsetY;

          setTagPos({
            x: Math.min(Math.max(centerX, 80), viewW - 80),
            y: Math.max(headY, 12),
            detected: true,
          });
        }, 350);
      } catch (err) {
        console.error("face detection failed:", err);
      }
    }

    startDetect();

    return () => {
      cancelled = true;

      if (detectTimerRef.current) {
        clearInterval(detectTimerRef.current);
      }
    };
  }, [stream]);

  const isCorrect = result?.is_correct;

  return (
    <div className="tracked-video-box">
      <video
        ref={videoRef}
        className="tracked-video"
        autoPlay
        playsInline
        muted
      />

      <div
        className={`tracked-ar-tag ${tagPos.detected ? "detected" : ""}`}
        style={
          tagPos.detected
            ? {
                left: `${tagPos.x}px`,
                top: `${tagPos.y}px`,
                transform: "translate(-50%, -100%)",
              }
            : {
                left: "50%",
                top: "16px",
                transform: "translateX(-50%)",
              }
        }
      >
        <strong>{playerName}</strong>
        <span>Score: {score}</span>

        {result ? (
          <em className={isCorrect ? "correct-text" : "wrong-text"}>
            {isCorrect ? "答對 ✅" : "答錯 ❌"}
          </em>
        ) : (
          <em className="wait-text">等待作答</em>
        )}
      </div>
    </div>
  );
}

export default TrackedPlayerVideo;