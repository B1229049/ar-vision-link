import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";
import "../styles/ARQuizGame.css";

function ARQuizGame() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const hostSocketIdRef = useRef(null);
  const iceConfigRef = useRef(null);

  const optionRefs = useRef({
    A: null,
    B: null,
    C: null,
    D: null,
  });

  const pointingRef = useRef({
    target: "",
    startTime: 0,
  });

  const answeredRef = useRef(false);
  const submittingRef = useRef(false);
  const timeLeftRef = useRef(20);
  const questionsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const currentQuestionRef = useRef(null);

  const BACKEND_URL =
    import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

  const currentUser = useMemo(() => {
    const raw =
      localStorage.getItem("currentUser") ||
      localStorage.getItem("user");

    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState("");

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [timeLeft, setTimeLeft] = useState(20);
  const [leaderboard, setLeaderboard] = useState([]);

  const [pointingTarget, setPointingTarget] = useState("");
  const [pointingProgress, setPointingProgress] = useState(0);
  const [fingerPoint, setFingerPoint] = useState(null);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    answeredRef.current = answered;
  }, [answered]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    questionsRef.current = questions;
    currentIndexRef.current = currentIndex;
    currentQuestionRef.current = questions[currentIndex] || null;
  }, [questions, currentIndex]);

  useEffect(() => {
    loadSession();
    startCamera();
    connectSocket();
    initHandTracking();

    return () => {
      stopCamera();
      disconnectSocket();
      clearTimer();
      stopHandTracking();
      cleanupWebRTC();
    };
  }, [sessionId]);

  useEffect(() => {
    if (
      videoRef.current &&
      streamRef.current &&
      videoRef.current.srcObject !== streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  });

  useEffect(() => {
    resetQuestionState();
  }, [currentIndex, questions]);

  async function getIceConfig() {
    if (iceConfigRef.current) return iceConfigRef.current;

    const res = await fetch(`${BACKEND_URL}/api/ice-config`);

    if (!res.ok) {
      throw new Error("ICE Config 載入失敗");
    }

    const config = await res.json();

    if (!config?.iceServers) {
      throw new Error("ICE Config 格式錯誤");
    }

    iceConfigRef.current = config;
    return config;
  }

  async function ensureLocalStream() {
    if (streamRef.current) return streamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
      },
      audio: false,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play?.();
    }

    return stream;
  }

  async function startCamera() {
    try {
      await ensureLocalStream();
    } catch (err) {
      console.error("AR camera error:", err);
      setCameraError("無法開啟相機，請確認瀏覽器權限");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function cleanupWebRTC() {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    hostSocketIdRef.current = null;
  }

  async function createOfferToHost(hostSocketId) {
    if (!hostSocketId || !socketRef.current) return;

    try {
      cleanupWebRTC();

      hostSocketIdRef.current = hostSocketId;

      const iceConfig = await getIceConfig();
      const localStream = await ensureLocalStream();

      const pc = new RTCPeerConnection(iceConfig);
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("webrtc-ice-candidate", {
            to: hostSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed" ||
          pc.connectionState === "disconnected"
        ) {
          cleanupWebRTC();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit("webrtc-offer", {
        to: hostSocketId,
        fromUserId: currentUser?.id,
        offer: pc.localDescription,
      });
    } catch (err) {
      console.error("AR 玩家建立 WebRTC offer 失敗：", err);
    }
  }

  async function handleWebRTCAnswer(answer) {
    const pc = peerConnectionRef.current;

    if (!pc || !answer) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error("AR 玩家設定 WebRTC answer 失敗：", err);
    }
  }

  async function handleRemoteIceCandidate(candidate) {
    const pc = peerConnectionRef.current;

    if (!pc || !candidate) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("AR 玩家加入 ICE candidate 失敗：", err);
    }
  }

  function connectSocket() {
    const socket = io(BACKEND_URL, {
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-session", {
        sessionId: Number(sessionId),
        userId: currentUser?.id,
        role: "player",
      });

      socket.emit("webrtc-player-ready", {
        sessionId: Number(sessionId),
        userId: currentUser?.id,
        user: currentUser,
      });
    });

    socket.on("session-sync", (data) => {
      const nextQuestions = data.questions || [];
      const nextIndex = Number(data.session?.current_question) || 0;

      setSessionData(data.session);
      setQuestions(nextQuestions);
      setLeaderboard(data.leaderboard || []);
      setCurrentIndex(nextIndex);

      questionsRef.current = nextQuestions;
      currentIndexRef.current = nextIndex;
      currentQuestionRef.current = nextQuestions[nextIndex] || null;
    });

    socket.on("question-changed", ({ session }) => {
      const nextIndex = Number(session?.current_question) || 0;

      setSessionData(session);
      setCurrentIndex(nextIndex);

      currentIndexRef.current = nextIndex;
      currentQuestionRef.current = questionsRef.current[nextIndex] || null;
    });

    socket.on("leaderboard-updated", ({ leaderboard }) => {
      setLeaderboard(leaderboard || []);
    });

    socket.on("game-finished", ({ session }) => {
      setSessionData(session);
      cleanupWebRTC();
      navigate(`/quiz/leaderboard/${session.session_id}`);
    });

    socket.on("webrtc-host-ready", ({ hostSocketId }) => {
      createOfferToHost(hostSocketId);
    });

    socket.on("webrtc-answer", ({ answer }) => {
      handleWebRTCAnswer(answer);
    });

    socket.on("webrtc-ice-candidate", ({ candidate }) => {
      handleRemoteIceCandidate(candidate);
    });

    socket.on("webrtc-user-disconnected", ({ role }) => {
      if (role === "host") {
        cleanupWebRTC();
      }
    });

    socket.on("socket-error", (data) => {
      alert(data.error || "Socket 發生錯誤");
    });
  }

  function disconnectSocket() {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer(seconds = 20) {
    clearTimer();

    const safeSeconds = Number(seconds) || 20;

    setTimeLeft(safeSeconds);
    timeLeftRef.current = safeSeconds;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          timeLeftRef.current = 0;
          return 0;
        }

        timeLeftRef.current = prev - 1;
        return prev - 1;
      });
    }, 1000);
  }

  function resetQuestionState() {
    if (!questions.length) return;

    const limit = Number(questions[currentIndex]?.time_limit) || 20;

    setSelectedAnswer("");
    setAnswered(false);
    setSubmitting(false);
    setResult(null);
    setPointingTarget("");
    setPointingProgress(0);
    setFingerPoint(null);

    answeredRef.current = false;
    submittingRef.current = false;

    pointingRef.current = {
      target: "",
      startTime: 0,
    };

    startTimer(limit);
  }

  async function loadSession() {
    try {
      setLoading(true);

      const res = await fetch(`${BACKEND_URL}/api/game-sessions/${sessionId}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "載入遊戲失敗");
      }

      const nextQuestions = data.questions || [];
      const nextIndex = data.session?.current_question || 0;

      setSessionData(data.session);
      setQuestions(nextQuestions);
      setCurrentIndex(nextIndex);

      questionsRef.current = nextQuestions;
      currentIndexRef.current = nextIndex;
      currentQuestionRef.current = nextQuestions[nextIndex] || null;

      const limit = Number(nextQuestions[nextIndex]?.time_limit) || 20;

      startTimer(limit);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function initHandTracking() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        }
      );

      detectHandsLoop();
    } catch (err) {
      console.error("Hand tracking init error:", err);
    }
  }

  function stopHandTracking() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }

  function detectHandsLoop() {
    const video = videoRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (
      video &&
      handLandmarker &&
      video.readyState >= 2 &&
      !answeredRef.current &&
      !submittingRef.current &&
      timeLeftRef.current > 0
    ) {
      const results = handLandmarker.detectForVideo(video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        const indexTip = results.landmarks[0][8];
        const videoRect = video.getBoundingClientRect();

        const x = videoRect.left + indexTip.x * videoRect.width;
        const y = videoRect.top + indexTip.y * videoRect.height;

        setFingerPoint({ x, y });
        checkPointingAnswer(x, y);
      } else {
        resetPointing();
      }
    }

    animationRef.current = requestAnimationFrame(detectHandsLoop);
  }

  function resetPointing() {
    pointingRef.current = {
      target: "",
      startTime: 0,
    };

    setPointingTarget("");
    setPointingProgress(0);
    setFingerPoint(null);
  }

  function findPointingTarget(x, y) {
    const hitElement = document.elementFromPoint(x, y);
    const answerElement = hitElement?.closest?.("[data-answer]");

    if (answerElement?.dataset?.answer) {
      return answerElement.dataset.answer;
    }

    for (const letter of ["A", "B", "C", "D"]) {
      const el = optionRefs.current[letter];
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const padding = 18;

      if (
        x >= rect.left - padding &&
        x <= rect.right + padding &&
        y >= rect.top - padding &&
        y <= rect.bottom + padding
      ) {
        return letter;
      }
    }

    return "";
  }

  function checkPointingAnswer(x, y) {
    if (answeredRef.current || submittingRef.current) return;

    const target = findPointingTarget(x, y);
    const now = performance.now();

    if (!target) {
      resetPointing();
      return;
    }

    if (pointingRef.current.target !== target) {
      pointingRef.current = {
        target,
        startTime: now,
      };

      setPointingTarget(target);
      setPointingProgress(0);
      return;
    }

    const elapsed = now - pointingRef.current.startTime;
    const progress = Math.min(elapsed / 1200, 1);

    setPointingTarget(target);
    setPointingProgress(progress);

    if (elapsed >= 1200) {
      const finalTarget = target;

      setPointingProgress(1);

      setTimeout(() => {
        resetPointing();
        handleAnswer(finalTarget);
      }, 120);
    }
  }

  async function handleAnswer(answer) {
    const activeQuestion = currentQuestionRef.current;

    if (!activeQuestion || answeredRef.current || submittingRef.current) {
      return;
    }

    if (!currentUser?.id) {
      alert("找不到登入使用者，請重新登入");
      return;
    }

    try {
      setSelectedAnswer(answer);
      setAnswered(true);
      setSubmitting(true);
      setResult(null);

      answeredRef.current = true;
      submittingRef.current = true;

      clearTimer();

      const res = await fetch(`${BACKEND_URL}/api/player-answers/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: Number(sessionId),
          question_id: activeQuestion.question_id,
          user_id: currentUser.id,
          answer,
          time_left: timeLeftRef.current,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "送出答案失敗");
      }

      setResult(data);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      alert(err.message);

      setAnswered(false);
      setSubmitting(false);
      setSelectedAnswer("");

      answeredRef.current = false;
      submittingRef.current = false;

      startTimer(Number(activeQuestion?.time_limit) || 20);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  function getOptionText(letter) {
    const options = currentQuestion?.options || {};

    return (
      options[letter] ||
      currentQuestion?.[`option_${letter.toLowerCase()}`] ||
      ""
    );
  }

  function getOptionClass(letter) {
    if (pointingTarget === letter && !answered) {
      return "pointing";
    }

    if (!answered) return "";

    if (submitting || !result) {
      if (selectedAnswer === letter) return "waiting";
      return "disabled";
    }

    if (selectedAnswer === letter && result?.is_correct) {
      return "correct";
    }

    if (selectedAnswer === letter && !result?.is_correct) {
      return "wrong";
    }

    return "disabled";
  }

  function goBack() {
    stopCamera();
    disconnectSocket();
    clearTimer();
    stopHandTracking();
    cleanupWebRTC();
    navigate(-1);
  }

  if (loading) {
    return (
      <div className="ar-quiz-page">
        <div className="ar-loading-card">載入 AR Quiz 中...</div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="ar-quiz-page">
        <div className="ar-loading-card">
          找不到目前題目
          <button onClick={goBack}>返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-quiz-page">
      <video
        ref={videoRef}
        className="ar-camera-video"
        autoPlay
        playsInline
        muted
      />

      <div className="ar-dark-overlay" />

      {fingerPoint && (
        <div
          className="ar-finger-dot"
          style={{
            left: `${fingerPoint.x}px`,
            top: `${fingerPoint.y}px`,
          }}
        />
      )}

      <button className="ar-back-btn" onClick={goBack}>
        ← 返回
      </button>

      <div className="ar-top-status">
        <span>
          第 {currentIndex + 1} / {questions.length} 題
        </span>

        <span className={timeLeft <= 5 ? "danger-time" : ""}>
          {timeLeft}s
        </span>

        <span>手指指向答案</span>
      </div>

      {cameraError && <div className="ar-camera-error">{cameraError}</div>}

      <div className="ar-question-card">{currentQuestion.question_text}</div>

      {["A", "B", "C", "D"].map((letter) => (
        <button
          key={letter}
          ref={(el) => {
            optionRefs.current[letter] = el;
          }}
          data-answer={letter}
          className={`ar-option ar-option-${letter.toLowerCase()} ${getOptionClass(
            letter
          )}`}
          onClick={() => handleAnswer(letter)}
          disabled={answered || timeLeft <= 0}
        >
          <span>{letter}</span>

          {getOptionText(letter)}

          {pointingTarget === letter && !answered && (
            <div className="ar-point-progress">
              <div
                style={{
                  width: `${Math.round(pointingProgress * 100)}%`,
                }}
              />
            </div>
          )}
        </button>
      ))}

      {timeLeft <= 0 && !answered && (
        <div className="ar-result-card">
          時間到
          <small>等待主持人切換下一題</small>
        </div>
      )}

      {answered && (
        <div className="ar-result-card">
          {submitting || !result
            ? "等待判定中..."
            : result?.is_correct
            ? "答對了！"
            : "答錯了"}

          <small>
            {submitting || !result
              ? "答案已送出，正在確認結果"
              : `獲得 ${result?.score_earned || 0} 分`}
          </small>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="ar-mini-leaderboard">
          <h4>即時排行</h4>

          {leaderboard.slice(0, 3).map((item, index) => (
            <div className="ar-rank-item" key={item.record_id}>
              <span>#{index + 1}</span>
              <strong>{item.users?.name || "玩家"}</strong>
              <em>{item.score || 0}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ARQuizGame;