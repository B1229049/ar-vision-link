import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/QuizGame.css";

const res = await fetch(`${BACKEND_URL}/api/ice-config`);
const ICE_CONFIG = await res.json();

function QuizGame() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const BACKEND_URL =
    import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const questionsRef = useRef([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [answerResult, setAnswerResult] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const currentIndex = session?.current_question || 0;

  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

  function cleanupWebRTC() {
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      peerConnectionsRef.current[socketId]?.close();
      delete peerConnectionsRef.current[socketId];
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    socketRef.current?.disconnect();
    socketRef.current = null;
  }

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);

    const socket = io(BACKEND_URL, {
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.emit("join-session", {
      sessionId: Number(sessionId),
      userId: user.id,
      role: "player",
    });

    socket.on("session-sync", (data) => {
      if (Number(user.id) === Number(data.quiz?.host_id)) {
        cleanupWebRTC();
        navigate(`/quiz/host-console/${sessionId}`);
        return;
      }

      setSession(data.session);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setLeaderboard(data.leaderboard || []);

      const me = data.leaderboard?.find(
        (p) => Number(p.user_id) === Number(user.id)
      );

      if (me) setScore(me.score || 0);

      const index = data.session?.current_question || 0;
      setTimeLeft(data.questions?.[index]?.time_limit || 20);
      setLoading(false);
    });

    socket.on("game-started", ({ session }) => {
      setSession(session);
      resetQuestionState(session.current_question);
    });

    socket.on("question-changed", ({ session }) => {
      setSession(session);
      resetQuestionState(session.current_question);
    });

    socket.on("player-result-updated", (data) => {
      if (Number(data.user_id) !== Number(user.id)) return;

      setAnswerResult(data);
      setScore(data.total_score || 0);
    });

    socket.on("leaderboard-updated", ({ leaderboard }) => {
      setLeaderboard(leaderboard || []);

      const me = leaderboard?.find(
        (p) => Number(p.user_id) === Number(user.id)
      );

      if (me) setScore(me.score || 0);
    });

    socket.on("game-finished", () => {
      cleanupWebRTC();
      navigate(`/quiz/leaderboard/${sessionId}`);
    });

    socket.on("webrtc-host-ready", async ({ hostSocketId }) => {
      if (!hostSocketId) return;
      await createOfferToHost(hostSocketId, user);
    });

    socket.on("webrtc-answer", async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (!pc || !answer) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("設定 remote answer 失敗：", err);
      }
    });

    socket.on("webrtc-ice-candidate", async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (!pc || !candidate) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Player 加入 ICE candidate 失敗：", err);
      }
    });

    socket.on("webrtc-user-disconnected", ({ socketId }) => {
      closePeerConnection(socketId);
    });

    socket.on("socket-error", (data) => {
      alert(data.error || "Socket 發生錯誤");
    });

    return () => {
      cleanupWebRTC();
    };
  }, [sessionId, navigate, BACKEND_URL]);

  useEffect(() => {
    if (loading || !currentUser) return;

    let stream = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("此瀏覽器不支援相機功能");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 15, max: 20 },
          },
          audio: false,
        });

        localStreamRef.current = stream;

        if (!videoRef.current) {
          setCameraError("video 元素尚未載入");
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setCameraError("");

        socketRef.current?.emit("webrtc-player-ready", {
          sessionId: Number(sessionId),
          userId: currentUser.id,
          user: {
            id: currentUser.id,
            name: currentUser.name,
            nickname: currentUser.nickname,
            avatar_url: currentUser.avatar_url,
          },
        });
      } catch (err) {
        console.error("無法開啟鏡頭：", err);
        setCameraError("無法開啟鏡頭，請允許瀏覽器相機權限");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [loading, currentUser, sessionId]);

  useEffect(() => {
    if (loading || !session || session.game_finished || answered) return;

    if (timeLeft <= 0) {
      setAnswered(true);
      setSelectedAnswer("");
      setAnswerResult({
        user_id: currentUser?.id,
        is_correct: false,
        score_earned: 0,
        total_score: score,
      });
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, loading, session, answered, currentUser, score]);

  async function createOfferToHost(hostSocketId, user) {
    if (!localStreamRef.current || !socketRef.current) return;

    closePeerConnection(hostSocketId);

    const pc = new RTCPeerConnection(ICE_CONFIG);

    peerConnectionsRef.current[hostSocketId] = pc;

    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
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
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        closePeerConnection(hostSocketId);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit("webrtc-offer", {
        to: hostSocketId,
        fromUserId: user.id,
        offer: pc.localDescription,
      });
    } catch (err) {
      console.error("建立 WebRTC offer 失敗：", err);
      closePeerConnection(hostSocketId);
    }
  }

  function closePeerConnection(socketId) {
    const pc = peerConnectionsRef.current[socketId];

    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[socketId];
    }
  }

  function resetQuestionState(index) {
    setSelectedAnswer("");
    setAnswered(false);
    setAnswerResult(null);
    setTimeLeft(questionsRef.current[index]?.time_limit || 20);
  }

  async function handleAnswer(answer) {
    if (!currentQuestion || answered || !session || !currentUser) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/player-answers/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: session.session_id,
          question_id: currentQuestion.question_id,
          user_id: currentUser.id,
          answer,
          time_left: timeLeft,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert(result.error || "送出答案失敗");
        return;
      }

      setAnswerResult({
        user_id: currentUser.id,
        is_correct: result.is_correct,
        score_earned: result.score_earned,
        total_score: result.total_score,
      });

      setScore(result.total_score || 0);
    } catch (err) {
      console.error("送出答案時發生錯誤：", err);
      alert("送出答案時發生錯誤");
    }
  }

  function getOptionClass(optionKey) {
    if (!answered) return "option-btn";

    if (optionKey === currentQuestion.correct_answer) {
      return "option-btn correct";
    }

    if (optionKey === selectedAnswer) {
      return "option-btn wrong";
    }

    return "option-btn disabled";
  }

  function leaveGame() {
    cleanupWebRTC();
    navigate("/quiz");
  }

  if (loading) {
    return (
      <div className="quiz-game-page">
        <div className="quiz-game-card">
          <p>載入遊戲中...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="quiz-game-page">
        <div className="quiz-game-card">
          <h2>沒有題目</h2>
          <button className="game-btn secondary" onClick={leaveGame}>
            返回 AR Vision Link
          </button>
        </div>
      </div>
    );
  }

  const options = currentQuestion.options || {};

  return (
    <div className="quiz-game-page">
      <div className="quiz-game-card">
        <div className="game-topbar">
          <div>
            <span>題目</span>
            <strong>
              {currentIndex + 1} / {questions.length}
            </strong>
          </div>

          <div>
            <span>分數</span>
            <strong>{score}</strong>
          </div>

          <div>
            <span>倒數</span>
            <strong>{timeLeft}s</strong>
          </div>
        </div>

        <div className="local-ar-preview">
          <video
            ref={videoRef}
            className="local-ar-video"
            autoPlay
            playsInline
            muted
            controls={false}
          />

          {cameraError && <div className="camera-error">{cameraError}</div>}

          <div className="ar-status-box">
            <strong>{currentUser?.nickname || currentUser?.name}</strong>
            <span>Score: {score}</span>

            {answerResult && (
              <em
                className={
                  answerResult.is_correct
                    ? "ar-answer-correct"
                    : "ar-answer-wrong"
                }
              >
                {answerResult.is_correct ? "答對 ✅" : "答錯 ❌"}
                <br />+{answerResult.score_earned || 0}
              </em>
            )}
          </div>
        </div>

        <h2>{quiz?.title || "AR Vision Link"}</h2>

        <div className="question-box">{currentQuestion.question_text}</div>

        <div className="options-grid">
          {["A", "B", "C", "D"].map((key) => (
            <button
              key={key}
              className={getOptionClass(key)}
              onClick={() => handleAnswer(key)}
              disabled={answered}
            >
              <span className="option-key">{key}</span>
              <span>{options[key]}</span>
            </button>
          ))}
        </div>

        {answered && (
          <div className="answer-result">
            {selectedAnswer === currentQuestion.correct_answer
              ? "答對了！"
              : selectedAnswer
              ? `答錯了，正確答案是 ${currentQuestion.correct_answer}`
              : `時間到，正確答案是 ${currentQuestion.correct_answer}`}
          </div>
        )}

        <div className="waiting-message">等待主持人切換下一題...</div>

        <button className="game-btn ghost" onClick={leaveGame}>
          離開遊戲
        </button>
      </div>
    </div>
  );
}

export default QuizGame;