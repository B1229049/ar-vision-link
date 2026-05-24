import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/QuizGame.css";

function QuizGame() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);

  const lastQuestionIndexRef = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);

    loadGame();

    const timer = setInterval(syncSession, 2000);

    return () => clearInterval(timer);
  }, [sessionId, navigate]);

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

  const currentIndex = session?.current_question || 0;

  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

  const isHost = currentUser?.id === quiz?.host_id;

  async function loadGame() {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${sessionId}`
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("載入遊戲失敗：" + (result.error || "未知錯誤"));
        navigate("/quiz");
        return;
      }

      setSession(result.session);
      setQuiz(result.quiz);
      setQuestions(result.questions || []);

      const index = result.session?.current_question || 0;
      lastQuestionIndexRef.current = index;
      setTimeLeft(result.questions?.[index]?.time_limit || 20);
    } catch (err) {
      console.error(err);
      alert("載入遊戲時發生錯誤");
    }

    setLoading(false);
  }

  async function syncSession() {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${sessionId}`
      );

      const result = await response.json();

      if (!response.ok || result.error) return;

      const newSession = result.session;
      const newIndex = newSession?.current_question || 0;

      if (newSession?.game_finished) {
        await saveScore();
        navigate(`/quiz/leaderboard/${sessionId}`);
        return;
      }

      setSession(newSession);
      setQuiz(result.quiz);
      setQuestions(result.questions || []);

      if (newIndex !== lastQuestionIndexRef.current) {
        lastQuestionIndexRef.current = newIndex;
        setSelectedAnswer("");
        setAnswered(false);
        setTimeLeft(result.questions?.[newIndex]?.time_limit || 20);
      }
    } catch (err) {
      console.error("同步遊戲狀態失敗：", err);
    }
  }

  function handleAnswer(answer) {
    if (!currentQuestion || answered) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    const isCorrect = answer === currentQuestion.correct_answer;

    if (isCorrect) {
      const baseScore = 1000;
      const bonus = Math.max(timeLeft, 0) * 10;
      const addScore = baseScore + bonus;

      setScore((prev) => {
        const next = prev + addScore;
        scoreRef.current = next;
        return next;
      });
    }
  }

  async function hostNextQuestion() {
    if (!isHost || !session) return;

    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      await finishGame();
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${session.session_id}/next`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_question: currentIndex,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("切換下一題失敗：" + (result.error || "未知錯誤"));
        return;
      }

      setSession(result.session);
      lastQuestionIndexRef.current = result.session.current_question;
      setSelectedAnswer("");
      setAnswered(false);
      setTimeLeft(questions[result.session.current_question]?.time_limit || 20);
    } catch (err) {
      console.error(err);
      alert("切換下一題時發生錯誤");
    }
  }

  async function finishGame() {
    await saveScore();

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/game-sessions/${session.session_id}/finish`,
        {
          method: "PUT",
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("結束遊戲失敗：" + (result.error || "未知錯誤"));
        return;
      }

      navigate(`/quiz/leaderboard/${session.session_id}`);
    } catch (err) {
      console.error(err);
      alert("結束遊戲時發生錯誤");
    }
  }

  async function saveScore() {
    const savedRecord = localStorage.getItem("currentPlayerRecord");

    if (!savedRecord) return;

    try {
      const record = JSON.parse(savedRecord);

      await fetch(`${BACKEND_URL}/api/player-records/${record.record_id}/score`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          score: scoreRef.current,
        }),
      });
    } catch (err) {
      console.error("更新分數失敗：", err);
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

        <h2>{quiz?.title || "Quiz Game"}</h2>

        <div className="question-box">
          {currentQuestion.question_text}
        </div>

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
          <div className="waiting-message">
            等待主持人切換下一題...
          </div>
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