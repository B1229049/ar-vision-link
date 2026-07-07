import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateQuiz.css";

function CreateQuiz() {
  const navigate = useNavigate();
  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  const [currentUser, setCurrentUser] = useState(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const [aiSourceType, setAiSourceType] = useState("text");
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("normal");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const [questions, setQuestions] = useState([
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

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
  }, [navigate]);

  function updateQuestion(index, field, value) {
    const nextQuestions = [...questions];
    nextQuestions[index][field] = value;
    setQuestions(nextQuestions);
  }

  function addQuestion() {
    setQuestions([
      ...questions,
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
    if (questions.length === 1) {
      alert("至少需要一題");
      return;
    }

    setQuestions(questions.filter((_, i) => i !== index));
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

      setQuestions(result.questions);

      if (!title.trim()) {
        setTitle("AI 產生測驗");
      }

      alert("AI 題目產生完成，可以再手動修改");
    } catch (err) {
      console.error(err);
      alert("AI 出題時發生錯誤");
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleCreateQuiz() {
    if (!currentUser) return;

    if (!title.trim()) {
      alert("請輸入測驗標題");
      return;
    }

    for (const q of questions) {
      if (
        !q.question_text.trim() ||
        !q.option_a.trim() ||
        !q.option_b.trim() ||
        !q.option_c.trim() ||
        !q.option_d.trim()
      ) {
        alert("請完整填寫每一題與 A/B/C/D 選項");
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/quizzes/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host_id: currentUser.id,
          title: title.trim(),
          questions,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("建立失敗：" + (result.error || "未知錯誤"));
        return;
      }

      alert("測驗建立成功！");
      navigate("/quiz");
    } catch (err) {
      console.error(err);
      alert("建立測驗時發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="create-quiz-page">
      <div className="create-quiz-card">
        <h2>建立測驗</h2>

        <p className="create-quiz-subtitle">
          可手動建立題目，也可以貼上文字或上傳 PDF/TXT 讓 AI 自動出題。
        </p>

        <div className="quiz-field">
          <label>測驗標題</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：植物構造小測驗"
          />
        </div>

        <div className="ai-wrapper">
          <button
            className="ai-toggle-btn"
            onClick={() => setShowAiPanel(!showAiPanel)}
          >
            🤖 AI 自動出題
            {showAiPanel ? " ▲" : " ▼"}
          </button>

          {showAiPanel && (
            <div className="ai-generate-box">
              <h3>AI 自動出題</h3>

              <div className="ai-options">
                <div className="quiz-field">
                  <label>資料來源</label>
                  <select
                    value={aiSourceType}
                    onChange={(e) => setAiSourceType(e.target.value)}
                  >
                    <option value="text">貼上文字 / TXT</option>
                    <option value="pdf">PDF 檔案</option>
                  </select>
                </div>

                <div className="quiz-field">
                  <label>題數</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                </div>

                <div className="quiz-field">
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

                <div className="quiz-field">
                  <label>上傳檔案</label>
                  <input
                    type="file"
                    accept=".txt,.pdf,text/plain,application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {aiSourceType === "text" && (
                <div className="quiz-field">
                  <label>教材文字</label>
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="可以直接貼上教材內容，或上傳 TXT 後自動帶入文字"
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

              <div className="button-row">
                <button
                  className="create-btn secondary"
                  onClick={handleGenerateByAI}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? "AI 產生中..." : "用 AI 產生 / 重新產生題目"}
                </button>
              </div>

            </div>
          )}
        </div>

        <div className="question-list">
          {questions.map((q, index) => (
            <div className="question-card" key={index}>
              <div className="question-header">
                <h3>第 {index + 1} 題</h3>

                <button
                  className="remove-question-btn"
                  onClick={() => removeQuestion(index)}
                >
                  刪除
                </button>
              </div>

              <div className="quiz-field">
                <label>題目</label>
                <textarea
                  value={q.question_text}
                  onChange={(e) =>
                    updateQuestion(index, "question_text", e.target.value)
                  }
                  placeholder="請輸入題目內容"
                />
              </div>

              <div className="option-grid">
                <div className="quiz-field quiz-option-field option-a">
                  <label>選項 A</label>
                  <input
                    value={q.option_a}
                    onChange={(e) =>
                      updateQuestion(index, "option_a", e.target.value)
                    }
                    placeholder="A"
                  />
                </div>

                <div className="quiz-field quiz-option-field option-b">
                  <label>選項 B</label>
                  <input
                    value={q.option_b}
                    onChange={(e) =>
                      updateQuestion(index, "option_b", e.target.value)
                    }
                    placeholder="B"
                  />
                </div>

                <div className="quiz-field quiz-option-field option-c">
                  <label>選項 C</label>
                  <input
                    value={q.option_c}
                    onChange={(e) =>
                      updateQuestion(index, "option_c", e.target.value)
                    }
                    placeholder="C"
                  />
                </div>

                <div className="quiz-field quiz-option-field option-d">
                  <label>選項 D</label>
                  <input
                    value={q.option_d}
                    onChange={(e) =>
                      updateQuestion(index, "option_d", e.target.value)
                    }
                    placeholder="D"
                  />
                </div>
              </div>

              <div className="option-grid">
                <div className="quiz-field">
                  <label>正確答案</label>
                  <select
                    value={q.correct_answer}
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
                    value={q.time_limit}
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

        <div className="button-row">
          <button className="create-btn secondary" onClick={addQuestion}>
            新增題目
          </button>

          <button
            className="create-btn primary"
            onClick={handleCreateQuiz}
            disabled={saving}
          >
            {saving ? "建立中..." : "建立測驗"}
          </button>

          <button className="create-btn ghost" onClick={() => navigate("/quiz")}>
            返回 Quiz Center
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateQuiz;
