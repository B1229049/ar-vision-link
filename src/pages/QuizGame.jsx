import { useEffect, useMemo, useState } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [gameFinished, setGameFinished] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
    loadGame();
  }, [sessionId, navigate]);

  useEffect(() => {
    if (loading || gameFinished || answered) return;

    if (timeLeft <= 0) {
      handleAnswer("");
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, loading, gameFinished, answered]);

  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

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

      const firstTimeLimit = result.questions?.[0]?.time_limit || 20;
      setTimeLeft(firstTimeLimit);
    } catch (err) {
      console.error(err);
      alert("載入遊戲時發生錯誤");
    }

    setLoading(false);
  }

  function handleAnswer(answer) {
    if (!currentQuestion || answered) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    const isCorrect = answer === currentQuestion.correct_answer;

    if (isCorrect) {
      const baseScore = 1000;
      const bonus = Math.max(timeLeft, 0) * 10;
      setScore((prev) => prev + baseScore + bonus);
    }
  }

  function nextQuestion() {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      finishGame();
      return;
    }

    setCurrentIndex(nextIndex);
    setSelectedAnswer("");
    setAnswered(false);
    setTimeLeft(questions[nextIndex]?.time_limit || 20);
  }

  async function finishGame() {
    setGameFinished(true);

    const finalScore = score;

    const savedRecord = localStorage.getItem("currentPlayerRecord");

    if (savedRecord) {
      try {
        const record = JSON.parse(savedRecord);

        await fetch(`${BACKEND_URL}/api/player-records/${record.record_id}/score`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score: finalScore,
          }),
        });
      } catch (err) {
        console.error("更新分數失敗：", err);
      }
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

  if (!currentQuestion && !gameFinished) {
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

  if (gameFinished) {
    return (
      <div className="quiz-game-page">
        <div className="quiz-game-card">
          <h2>遊戲結束</h2>

          <p className="game-subtitle">{quiz?.title || "Quiz"}</p>

          <div className="final-score-box">
            <span>你的分數</span>
            <strong>{score}</strong>
          </div>

          <button
            className="game-btn primary"
            onClick={() => navigate(`/quiz/lobby/${sessionId}`)}
          >
            回等待室
          </button>

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

        {answered && (
          <button className="game-btn primary" onClick={nextQuestion}>
            {currentIndex + 1 >= questions.length ? "完成遊戲" : "下一題"}
          </button>
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