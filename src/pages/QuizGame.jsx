import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/QuizGame.css";

function QuizGame() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const BACKEND_URL =
    import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";

  const socketRef = useRef(null);
  const lastQuestionIndexRef = useRef(0);

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

  const currentIndex = session?.current_question || 0;

  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

  const isHost = Number(currentUser?.id) === Number(quiz?.host_id);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);

    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.emit("join-session", {
      sessionId: Number(sessionId),
      userId: user.id,
      role: "player",
    });

    socket.on("session-sync", (data) => {
      setSession(data.session);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setLeaderboard(data.leaderboard || []);

      const me = data.leaderboard?.find(
        (p) => Number(p.user_id) === Number(user.id)
      );

      if (me) {
        setScore(me.score || 0);
      }

      const index = data.session?.current_question || 0;
      lastQuestionIndexRef.current = index;
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

      if (me) {
        setScore(me.score || 0);
      }
    });

    socket.on("game-finished", () => {
      navigate(`/quiz/leaderboard/${sessionId}`);
    });

    socket.on("socket-error", (data) => {
      alert(data.error || "Socket 發生錯誤");
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, navigate, BACKEND_URL]);

  useEffect(() => {
    if (loading || !session || session.game_finished || answered) return;

    if (timeLeft <= 0) {
      handleAnswer("");
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, loading, session, answered]);

  function resetQuestionState(index) {
    lastQuestionIndexRef.current = index;
    setSelectedAnswer("");
    setAnswered(false);
    setAnswerResult(null);
    setTimeLeft(questions[index]?.time_limit || 20);
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
        console.error("送出答案失敗：", result.error || result);
        alert("送出答案失敗");
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

  function hostNextQuestion() {
    if (!isHost || !session) return;

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
    if (!isHost || !session) return;

    socketRef.current?.emit("finish-game", {
      sessionId: Number(session.session_id),
    });
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
          <button className="game-btn secondary" onClick={() => navigate("/quiz")}>
            返回 Quiz Center
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

            {!answerResult && answered && (
              <em className="ar-answer-wrong">等待結果...</em>
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

        {isHost ? (
          <button className="game-btn primary" onClick={hostNextQuestion}>
            {currentIndex + 1 >= questions.length ? "結束遊戲" : "下一題"}
          </button>
        ) : (
          <div className="waiting-message">等待主持人切換下一題...</div>
        )}

        <button
          className="game-btn ghost"
          onClick={() => navigate(`/quiz/lobby/${sessionId}`)}
        >
          離開遊戲
        </button>
      </div>
    </div>
  );
}

export default QuizGame;