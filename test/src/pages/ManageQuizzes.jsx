import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ManageQuizzes.css";

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

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSourceType, setAiSourceType] = useState("text");
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("normal");
  const [aiGenerating, setAiGenerating] = useState(false);

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

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();

      reader.onload = () => {
        setSourceText(reader.result);
        setAiSourceType("text");
      };

      reader.readAsText(file, "utf-8");
      return;
    }

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setAiSourceType("pdf");
      return;
    }

    alert("目前只支援 TXT 或 PDF");
    setSelectedFile(null);
  }

  async function handleGenerateByAI() {
    if (!selectedQuiz) {
      alert("請先選擇要編輯的測驗");
      return;
    }

    setAiGenerating(true);

    try {
      let response;

      if (aiSourceType === "text") {
        if (!sourceText.trim()) {
          alert("請先貼上文字或上傳 TXT 檔案");
          return;
        }

        response = await fetch(`${BACKEND_URL}/api/ai/generate-quiz`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: sourceText,
            question_count: questionCount,
            difficulty,
          }),
        });
      }

      if (aiSourceType === "pdf") {
        if (!selectedFile) {
          alert("請先上傳 PDF 檔案");
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("question_count", questionCount);
        formData.append("difficulty", difficulty);

        response = await fetch(`${BACKEND_URL}/api/ai/generate-quiz-pdf`, {
          method: "POST",
          body: formData,
        });
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert("AI 產生題目失敗：" + (result.error || "未知錯誤"));
        return;
      }

      const aiQuestions = (result.questions || []).map((q) => ({
        question_text: q.question_text || "",
        option_a: q.option_a || "",
        option_b: q.option_b || "",
        option_c: q.option_c || "",
        option_d: q.option_d || "",
        correct_answer: q.correct_answer || "A",
        time_limit: Number(q.time_limit) || 20,
      }));

      setQuestions((prev) => [...prev, ...aiQuestions]);

      alert(`AI 已新增 ${aiQuestions.length} 題到目前測驗`);
    } catch (err) {
      console.error(err);
      alert("AI 出題時發生錯誤");
    } finally {
      setAiGenerating(false);
    }
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
        prev.map((q) => (q.quiz_id === selectedQuiz.quiz_id ? updatedQuiz : q))
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
    <div className="manage-quizzes-page">
      <div className="manage-quizzes-container">
        <div className="manage-quizzes-header">
          <div>
            <h1>管理 Quiz</h1>
            <p>選擇測驗後，可以編輯題目、刪除題目，或用 AI 新增題目。</p>
          </div>

          <button className="manage-btn ghost" onClick={() => navigate("/quiz")}>
            返回 Quiz Center
          </button>
        </div>

        <div className="manage-layout">
          <aside className="quiz-sidebar">
            <h2>我的測驗</h2>

            {loading && quizzes.length === 0 ? (
              <p className="loading-text">載入中...</p>
            ) : quizzes.length === 0 ? (
              <p className="empty-text">目前沒有已建立的測驗。</p>
            ) : (
              <div className="quiz-list">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.quiz_id}
                    className={
                      selectedQuiz?.quiz_id === quiz.quiz_id
                        ? "quiz-item active"
                        : "quiz-item"
                    }
                    onClick={() => selectQuiz(quiz)}
                  >
                    <div className="quiz-item-title">{quiz.title}</div>
                    <div className="quiz-item-id">ID：{quiz.quiz_id}</div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main className="quiz-editor">
            {!selectedQuiz ? (
              <div className="quiz-editor-empty">
                <h2>請選擇左側測驗</h2>
                <p>選擇後即可預覽、編輯、新增或刪除題目。</p>
              </div>
            ) : (
              <>
                <div className="quiz-editor-top">
                  <div>
                    <h2>編輯測驗</h2>
                    <p>目前共 {questions.length} 題</p>
                  </div>

                  <button className="manage-btn danger" onClick={deleteSelectedQuiz}>
                    刪除整份測驗
                  </button>
                </div>

                <div className="quiz-setting-panel">
                  <label>測驗標題</label>
                  <input
                    className="quiz-title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="ai-manage-panel">
                  <button
                    className="ai-manage-toggle"
                    onClick={() => setShowAiPanel((prev) => !prev)}
                  >
                    🤖 AI 新增題目 {showAiPanel ? "▲" : "▼"}
                  </button>

                  {showAiPanel && (
                    <div className="ai-manage-content">
                      <div className="ai-manage-grid">
                        <div className="manage-field">
                          <label>資料來源</label>
                          <select
                            value={aiSourceType}
                            onChange={(e) => setAiSourceType(e.target.value)}
                          >
                            <option value="text">貼上文字 / TXT</option>
                            <option value="pdf">PDF 檔案</option>
                          </select>
                        </div>

                        <div className="manage-field">
                          <label>題數</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={questionCount}
                            onChange={(e) =>
                              setQuestionCount(Number(e.target.value))
                            }
                          />
                        </div>

                        <div className="manage-field">
                          <label>難度</label>
                          <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                          >
                            <option value="easy">簡單</option>
                            <option value="normal">普通</option>
                            <option value="hard">困難</option>
                          </select>
                        </div>

                        <div className="manage-field">
                          <label>上傳檔案</label>
                          <input
                            type="file"
                            accept=".txt,.pdf,text/plain,application/pdf"
                            onChange={handleFileChange}
                          />
                        </div>
                      </div>

                      {aiSourceType === "text" && (
                        <div className="manage-field">
                          <label>教材文字</label>
                          <textarea
                            className="ai-textarea"
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="貼上教材內容，或上傳 TXT 後自動帶入文字"
                          />
                        </div>
                      )}

                      {aiSourceType === "pdf" && (
                        <div className="upload-box">
                          {selectedFile ? (
                            <p>已選擇 PDF：{selectedFile.name}</p>
                          ) : (
                            <p>請上傳 PDF 檔案</p>
                          )}
                        </div>
                      )}

                      <button
                        className="manage-btn secondary"
                        onClick={handleGenerateByAI}
                        disabled={aiGenerating}
                      >
                        {aiGenerating ? "AI 產生中..." : "用 AI 新增題目"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="question-list">
                  {questions.map((q, index) => (
                    <div className="question-card" key={q.question_id || index}>
                      <div className="question-header">
                        <h3>第 {index + 1} 題</h3>

                        <button
                          className="manage-btn danger"
                          onClick={() => removeQuestion(index)}
                        >
                          刪除
                        </button>
                      </div>

                      <div className="manage-field">
                        <label>題目</label>
                        <textarea
                          className="question-input"
                          value={q.question_text || ""}
                          onChange={(e) =>
                            updateQuestion(index, "question_text", e.target.value)
                          }
                        />
                      </div>

                      <div className="options-grid">
                        {["a", "b", "c", "d"].map((letter) => (
                          <div className="option-box" key={letter}>
                            <label>選項 {letter.toUpperCase()}</label>
                            <input
                              className="option-input"
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

                      <div className="question-meta">
                        <div>
                          <label>正確答案</label>
                          <select
                            className="answer-select"
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

                        <div>
                          <label>時間限制（秒）</label>
                          <input
                            className="time-input"
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

                <div className="editor-actions sticky-actions">
                  <button className="manage-btn secondary" onClick={addQuestion}>
                    新增題目
                  </button>

                  <button
                    className="manage-btn primary"
                    onClick={saveQuiz}
                    disabled={saving}
                  >
                    {saving ? "儲存中..." : "儲存修改"}
                  </button>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default ManageQuizzes;