import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import TrackedPlayerVideo from "../components/TrackedPlayerVideo";
import VirtualAvatarHead from "../components/VirtualAvatarHead";
import "../styles/HostConsole.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

function HostConsole() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const questionsRef = useRef([]);
  const iceConfigRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [playerResults, setPlayerResults] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const currentIndex = session?.current_question || 0;

  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const answeredUserIds = useMemo(() => {
    return new Set(answers.map((a) => Number(a.user_id)));
  }, [answers]);

  const answerStats = ["A", "B", "C", "D"].map((key) => {
    const count = answers.filter((a) => a.answer === key).length;
    const percent =
      players.length > 0 ? Math.round((count / players.length) * 100) : 0;

    return { key, count, percent };
  });

  useEffect(() => {
    async function loadIceConfig() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/ice-config`);

        if (!res.ok) {
          throw new Error(`ICE Config API error: ${res.status}`);
        }

        const config = await res.json();

        if (!config?.iceServers) {
          throw new Error("ICE_CONFIG 格式錯誤");
        }

        iceConfigRef.current = config;
      } catch (err) {
        console.error("載入 ICE_CONFIG 失敗：", err);
        alert("無法取得 ICE 設定，請確認 /api/ice-config");
      }
    }

    loadIceConfig();
  }, []);

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

    socket.on("connect", () => {
      socket.emit("join-session", {
        sessionId: Number(sessionId),
        userId: user.id,
        role: "host",
      });

      socket.emit("webrtc-host-ready", {
        sessionId: Number(sessionId),
        userId: user.id,
      });
    });

    socket.on("session-sync", async (data) => {
      setSession(data.session);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setPlayers(data.leaderboard || []);
      setLoading(false);

      const q = data.questions?.[data.session?.current_question || 0];
      if (q) await loadQuestionAnswers(q.question_id);
    });

    socket.on("player-joined", async () => {
      await loadPlayers();

      socket.emit("webrtc-host-ready", {
        sessionId: Number(sessionId),
        userId: user.id,
      });
    });

    socket.on("webrtc-player-ready", () => {
      socket.emit("webrtc-host-ready", {
        sessionId: Number(sessionId),
        userId: user.id,
      });
    });

    socket.on("webrtc-offer", async ({ from, fromUserId, offer }) => {
      await handleWebRTCOffer(from, fromUserId, offer);
    });

    socket.on("webrtc-ice-candidate", async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];

      if (!pc || !candidate) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Host 加入 ICE candidate 失敗：", err);
      }
    });

    socket.on("webrtc-user-disconnected", ({ socketId }) => {
      closePeerConnection(socketId);
    });

    socket.on("game-started", ({ session }) => {
      setSession(session);
      setAnswers([]);
      setPlayerResults({});
      setChanging(false);
    });

    socket.on("question-changed", async ({ session }) => {
      setSession(session);
      setAnswers([]);
      setPlayerResults({});
      setChanging(false);

      const nextQuestion = questionsRef.current[session.current_question];
      if (nextQuestion) {
        await loadQuestionAnswers(nextQuestion.question_id);
      }
    });

    socket.on("answer-submitted", (data) => {
      setAnswers((prev) => {
        const filtered = prev.filter(
          (item) =>
            !(
              Number(item.user_id) === Number(data.user_id) &&
              Number(item.question_id) === Number(data.question_id)
            )
        );

        return [...filtered, data.answer];
      });
    });

    socket.on("player-result-updated", (data) => {
      setPlayerResults((prev) => ({
        ...prev,
        [Number(data.user_id)]: data,
      }));
    });

    socket.on("leaderboard-updated", ({ leaderboard }) => {
      setPlayers(leaderboard || []);
    });

    socket.on("game-finished", ({ session, leaderboard }) => {
      setSession(session);
      setPlayers(leaderboard || []);
      setChanging(false);
      cleanupWebRTC();
      navigate(`/quiz/leaderboard/${session.session_id}`);
    });

    socket.on("socket-error", (data) => {
      alert(data.error || "Socket 發生錯誤");
      setChanging(false);
    });

    return () => {
      cleanupWebRTC();
    };
  }, [sessionId, navigate]);

  function cleanupWebRTC() {
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      const pc = peerConnectionsRef.current[socketId];

      if (pc) {
        pc.close();
        delete peerConnectionsRef.current[socketId];
      }
    });

    setRemoteStreams({});

    socketRef.current?.disconnect();
    socketRef.current = null;
  }

  async function handleWebRTCOffer(playerSocketId, fromUserId, offer) {
    if (!playerSocketId || !offer || !socketRef.current) return;

    if (!iceConfigRef.current) {
      console.warn("ICE config 尚未載入，略過這次 offer");
      return;
    }

    try {
      closePeerConnection(playerSocketId);

      const pc = new RTCPeerConnection(iceConfigRef.current);
      peerConnectionsRef.current[playerSocketId] = pc;

      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (!stream) return;

        setRemoteStreams((prev) => ({
          ...prev,
          [playerSocketId]: {
            stream,
            userId: Number(fromUserId),
          },
        }));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("webrtc-ice-candidate", {
            to: playerSocketId,
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
          closePeerConnection(playerSocketId);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit("webrtc-answer", {
        to: playerSocketId,
        answer: pc.localDescription,
      });
    } catch (err) {
      console.error("Host 處理 WebRTC offer 失敗:", err);
      closePeerConnection(playerSocketId);
    }
  }

  function closePeerConnection(socketId) {
    const pc = peerConnectionsRef.current[socketId];

    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[socketId];
    }

    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }

  async function loadPlayers() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leaderboard/${sessionId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setPlayers(result.leaderboard || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadQuestionAnswers(questionId) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/player-answers/session/${sessionId}/question/${questionId}`
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setAnswers(result.answers || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function nextQuestion() {
    if (!session || changing) return;

    setChanging(true);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      finishGame();
      return;
    }

    socketRef.current?.emit("next-question", {
      sessionId: Number(session.session_id),
      currentQuestion: currentIndex,
    });
  }

  function finishGame() {
    if (!session || changing) return;

    setChanging(true);

    socketRef.current?.emit("finish-game", {
      sessionId: Number(session.session_id),
    });
  }

  async function handleBackToHome() {
    const confirmLeave = window.confirm(
      "確定要結束測驗並返回 AR Vision Link 嗎？所有玩家都會結束遊戲。"
    );

    if (!confirmLeave) return;

    try {
      setChanging(true);

      const res = await fetch(
        `${BACKEND_URL}/api/game-sessions/${sessionId}/finish`,
        {
          method: "PUT",
        }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "結束測驗失敗");
      }

      cleanupWebRTC();

      navigate("/quiz");
    } catch (err) {
      alert(err.message);
      setChanging(false);
    }
  }

  function leaveConsole() {
    cleanupWebRTC();
    navigate("/quiz");
  }

  function getPlayerAnswer(userId) {
    return answers.find((a) => Number(a.user_id) === Number(userId));
  }

  function getPlayerResult(userId) {
    return playerResults[Number(userId)];
  }

  if (loading) {
    return (
      <div className="host-console-page">
        <div className="host-console-card">
          <p>載入主持人中控台...</p>
        </div>
      </div>
    );
  }

  if (Number(currentUser?.id) !== Number(quiz?.host_id)) {
    return (
      <div className="host-console-page">
        <div className="host-console-card">
          <h2>沒有權限</h2>
          <p>只有主持人可以進入中控台。</p>

          <button className="console-btn secondary" onClick={leaveConsole}>
            返回 AR Vision Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="host-console-page">
      <div className="host-console-card">
        <h2>主持人中控台</h2>

        <p className="console-subtitle">{quiz?.title}</p>

        <div className="console-topbar">
          <div>
            <span>房號</span>
            <strong>{session?.room_code}</strong>
          </div>

          <div>
            <span>題目</span>
            <strong>
              {currentIndex + 1} / {questions.length}
            </strong>
          </div>

          <div>
            <span>玩家</span>
            <strong>{players.length}</strong>
          </div>

          <div>
            <span>已作答</span>
            <strong>{answers.length}</strong>
          </div>
        </div>

        {currentQuestion && (
          <>
            <div className="console-question">
              {currentQuestion.question_text}
            </div>

            <div className="console-options">
              {["A", "B", "C", "D"].map((key) => (
                <div
                  key={key}
                  className={
                    key === currentQuestion.correct_answer
                      ? "console-option correct"
                      : "console-option"
                  }
                >
                  <strong>{key}</strong>
                  <span>{currentQuestion.options?.[key]}</span>
                </div>
              ))}
            </div>

            <div className="stats-panel">
              <h3>本題選項統計</h3>

              <div className="stats-list">
                {answerStats.map((item) => (
                  <div className="stat-row" key={item.key}>
                    <div className="stat-label">
                      <strong>{item.key}</strong>
                      <span>{item.count} 人</span>
                    </div>

                    <div className="stat-bar-bg">
                      <div
                        className="stat-bar"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>

                    <div className="stat-percent">{item.percent}%</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="answer-panel">
          <h3>本題作答狀況</h3>

          {players.length === 0 ? (
            <p className="console-hint">目前沒有玩家。</p>
          ) : (
            <div className="answer-list">
              {players.map((record) => {
                const user = record.users;
                const ans = getPlayerAnswer(record.user_id);
                const result = getPlayerResult(record.user_id);

                return (
                  <div className="answer-item" key={record.record_id}>
                    <VirtualAvatarHead
                      config={user?.avatar_config}
                      className="answer-avatar"
                    />

                    <div className="answer-user">
                      <strong>{user?.name || "未知玩家"}</strong>
                    </div>

                    <div className="answer-status">
                      {answeredUserIds.has(Number(record.user_id)) ? (
                        ans?.is_correct ? (
                          <span className="correct-text">答對 +{ans.score}</span>
                        ) : (
                          <span className="wrong-text">答錯 +0</span>
                        )
                      ) : result ? (
                        result.is_correct ? (
                          <span className="correct-text">
                            答對 +{result.score_earned}
                          </span>
                        ) : (
                          <span className="wrong-text">答錯 +0</span>
                        )
                      ) : (
                        <span className="wait-text">未作答</span>
                      )}
                    </div>

                    <div className="answer-status">
                      <strong>{record.score || 0} 分</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ar-host-section">
          <h3>AR 玩家即時視訊</h3>

          {players.length === 0 ? (
            <p className="console-hint">尚無玩家可顯示。</p>
          ) : (
            <div className="ar-player-grid">
              {players.map((record) => {
                const user = record.users;
                const result = getPlayerResult(record.user_id);
                const ans = getPlayerAnswer(record.user_id);

                const remoteEntry = Object.values(remoteStreams).find(
                  (item) => Number(item.userId) === Number(record.user_id)
                );

                return (
                  <div className="ar-player-card" key={record.record_id}>
                    {remoteEntry?.stream ? (
                      <TrackedPlayerVideo
                        stream={remoteEntry.stream}
                        playerName={user?.nickname || user?.name || "Player"}
                        score={record.score || 0}
                        result={result || ans}
                      />
                    ) : (
                      <div className="host-video-placeholder">
                        等待玩家視訊...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          className="console-btn primary"
          onClick={nextQuestion}
          disabled={changing}
        >
          {changing
            ? "處理中..."
            : currentIndex + 1 >= questions.length
            ? "結束遊戲"
            : "下一題"}
        </button>

        <button
          className="console-btn secondary"
          onClick={handleBackToHome}
          disabled={changing}
        >
          返回 AR Vision Link
        </button>
      </div>
    </div>
  );
}

export default HostConsole;
