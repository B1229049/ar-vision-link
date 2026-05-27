import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateQuiz.css";

function ManageQuizzes() {
  const navigate = useNavigate();
  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);
    loadMyQuizzes(user.id);
  }, [navigate]);

  function normalizeQuestion(q) {
    let options = q.options || {};

    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch {
        options = {};
      }
    }

    return {
      ...q,
      option_a: q.option_a ?? options.A ?? "",
      option_b: q.option_b ?? options.B ?? "",
      option_c: q.option_c ?? options.C ?? "",
      option_d: q.option_d ?? options.D ?? "",
    };
  }

  async function loadMyQuizzes(userId) {
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/quizzes/host/${userId}`);
      const result = await res.json();

      if (!res.ok || result.error) {
        alert("載入測驗失敗：" + (result.error || "未知錯誤"));
        return;
      }

      setQuizzes(result.quizzes || []);
    } catch (err) {
      console.error(err);
      alert("載入測驗時發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  async function selectQuiz(quiz) {
    setSelectedQuiz(quiz);
    setTitle(quiz.title || "");
    setQuestions([]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/quizzes/${quiz.quiz_id}`);
      const result = await res.json();

      if (!res.ok || result.error) {
        alert("載入題目失敗：" + (result.error || "未知錯誤"));
        return;
      }

      if (Number(result.quiz.host_id) !== Number(currentUser.id)) {
        alert("你不能編輯別人的測驗");
        setSelectedQuiz(null);
        return;
      }

      setTitle(result.quiz.title || "");
      setQuestions((result.questions || []).map(normalizeQuestion));
    } catch (err) {
      console.error(err);
      alert("載入題目時發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index, field, value) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        time_limit: 20,
      },
    ]);
  }

  function removeQuestion(index) {
    const ok = window.confirm(`確定刪除第 ${index + 1} 題嗎？`);
    if (!ok) return;

    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveQuiz() {
    if (!selectedQuiz || !currentUser) {
      alert("請先選擇測驗");
      return;
    }

    if (!title.trim()) {
      alert("請輸入測驗標題");
      return;
    }

    if (questions.length === 0) {
      alert("至少需要一題");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (
        !q.question_text?.trim() ||
        !q.option_a?.trim() ||
        !q.option_b?.trim() ||
        !q.option_c?.trim() ||
        !q.option_d?.trim()
      ) {
        alert(`第 ${i + 1} 題尚未填寫完整`);
        return;
      }
    }

    const formattedQuestions = questions.map((q) => ({
      question_id: q.question_id,
      question_text: q.question_text,
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
      },
      correct_answer: q.correct_answer || "A",
      time_limit: Number(q.time_limit) || 20,
    }));

    setSaving(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/quizzes/${selectedQuiz.quiz_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            host_id: currentUser.id,
            title: title.trim(),
            questions: formattedQuestions,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || result.error) {
        alert("儲存失敗：" + (result.error || "未知錯誤"));
        return;
      }

      const updatedQuiz = {
        ...selectedQuiz,
        title: title.trim(),
      };

      setSelectedQuiz(updatedQuiz);

      setQuizzes((prev) =>
        prev.map((q) =>
          q.quiz_id === selectedQuiz.quiz_id ? updatedQuiz : q
        )
      );

      alert("測驗已更新");
    } catch (err) {
      console.error(err);
      alert("儲存測驗時發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedQuiz() {
    if (!selectedQuiz || !currentUser) {
      alert("請先選擇測驗");
      return;
    }

    const ok = window.confirm(
      `確定要刪除「${selectedQuiz.title}」嗎？\n此操作會刪除整份測驗與所有題目。`
    );

    if (!ok) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/quizzes/${selectedQuiz.quiz_id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            host_id: currentUser.id,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || result.error) {
        alert("刪除失敗：" + (result.error || "未知錯誤"));
        return;
      }

      setQuizzes((prev) =>
        prev.filter((q) => q.quiz_id !== selectedQuiz.quiz_id)
      );

      setSelectedQuiz(null);
      setTitle("");
      setQuestions([]);

      alert("測驗已刪除");
    } catch (err) {
      console.error(err);
      alert("刪除測驗時發生錯誤");
    }
  }

  if (!currentUser) {
    return (
      <div className="create-quiz-page">
        <div className="create-quiz-card">
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-quiz-page">
      <div className="create-quiz-card">
        <h2>編輯 Quiz</h2>

        <button className="create-btn ghost" onClick={() => navigate("/quiz")}>
          返回 Quiz Center
        </button>

        <div className="question-card">
          <h3>已建立的測驗</h3>

          {loading && quizzes.length === 0 ? (
            <p>載入中...</p>
          ) : quizzes.length === 0 ? (
            <p>目前沒有已建立的測驗。</p>
          ) : (
            <div className="question-list">
              {quizzes.map((quiz) => (
                <button
                  key={quiz.quiz_id}
                  className="create-btn secondary"
                  onClick={() => selectQuiz(quiz)}
                >
                  {quiz.title}（ID：{quiz.quiz_id}）
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedQuiz && (
          <>
            <div className="question-card">
              <h3>測驗設定</h3>

              <div className="quiz-field">
                <label>測驗標題</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <button className="create-btn danger" onClick={deleteSelectedQuiz}>
                刪除整份測驗
              </button>
            </div>

            <div className="question-list">
              {questions.map((q, index) => (
                <div className="question-card" key={q.question_id || index}>
                  <div className="question-header">
                    <h3>第 {index + 1} 題</h3>

                    <button
                      className="create-btn danger"
                      onClick={() => removeQuestion(index)}
                    >
                      刪除題目
                    </button>
                  </div>

                  <div className="quiz-field">
                    <label>題目</label>
                    <textarea
                      value={q.question_text || ""}
                      onChange={(e) =>
                        updateQuestion(index, "question_text", e.target.value)
                      }
                    />
                  </div>

                  <div className="option-grid">
                    {["a", "b", "c", "d"].map((letter) => (
                      <div className="quiz-field" key={letter}>
                        <label>選項 {letter.toUpperCase()}</label>
                        <input
                          value={q[`option_${letter}`] || ""}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              `option_${letter}`,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="option-grid">
                    <div className="quiz-field">
                      <label>正確答案</label>
                      <select
                        value={q.correct_answer || "A"}
                        onChange={(e) =>
                          updateQuestion(index, "correct_answer", e.target.value)
                        }
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>

                    <div className="quiz-field">
                      <label>時間限制（秒）</label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={q.time_limit || 20}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            "time_limit",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="create-btn secondary" onClick={addQuestion}>
              新增題目
            </button>

            <button
              className="create-btn primary"
              onClick={saveQuiz}
              disabled={saving}
            >
              {saving ? "儲存中..." : "儲存修改"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ManageQuizzes;