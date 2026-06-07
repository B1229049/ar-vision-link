import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  function logout() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-left">
          <div className="hero-badge">AR Vision Link</div>

          <h1>
            結合 AR、人臉辨識與 AI 出題的
            <span> 即時互動測驗平台</span>
          </h1>

          <p>
            支援臉部登入、多人 AR 辨識、即時 Quiz 遊戲，以及 Gemini AI
            文字 / PDF 自動出題，讓課堂、展示與活動互動更加智慧化。
          </p>

          <div className="hero-actions">
            {currentUser ? (
              <>
                <Link to="/quiz/create" className="home-btn primary">
                  建立 AI 測驗
                </Link>

                <Link to="/camera" className="home-btn secondary">
                  開啟 AR Camera
                </Link>

                <Link to="/profile" className="home-btn secondary">
                  個人資料
                </Link>

                <button className="home-btn danger" onClick={logout}>
                  登出
                </button>
              </>
            ) : (
              <>
                <Link to="/face-login" className="home-btn primary">
                  臉部登入
                </Link>

                <Link to="/register" className="home-btn secondary">
                  註冊帳號
                </Link>

                <Link to="/quiz/join" className="home-btn secondary">
                  加入測驗
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="hero-dashboard">
          <div className="dashboard-card main">
            <span>AI Quiz</span>
            <strong>PDF → 選擇題</strong>
            <p>自動產生題目、選項與正確答案</p>
          </div>

          <div className="dashboard-grid">
            <div className="mini-card">
              <strong>Face Login</strong>
              <span>臉部登入</span>
            </div>

            <div className="mini-card">
              <strong>AR Camera</strong>
              <span>多人辨識</span>
            </div>

            <div className="mini-card">
              <strong>Real-time</strong>
              <span>同步作答</span>
            </div>

            <div className="mini-card">
              <strong>Gemini</strong>
              <span>AI 出題</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-title">
          <span>Core Features</span>
          <h2>核心功能</h2>
          <p>從登入、出題、主持到玩家互動，完整支援即時測驗流程。</p>
        </div>

        <div className="feature-grid">
          <Link to="/face-login" className="feature-card">
            <div className="feature-icon">01</div>
            <h3>臉部登入</h3>
            <p>使用 face descriptor 進行後端比對，不讓前端取得臉部特徵資料。</p>
          </Link>

          <Link to="/quiz/create" className="feature-card">
            <div className="feature-icon">02</div>
            <h3>AI 自動出題</h3>
            <p>貼上文字或上傳 PDF，透過 Gemini 產生可編輯的四選一題目。</p>
          </Link>

          <Link to="/quiz" className="feature-card">
            <div className="feature-icon">03</div>
            <h3>即時 Quiz</h3>
            <p>主持人建立房間，玩家輸入房號加入，支援即時題目同步與計分。</p>
          </Link>

          <Link to="/camera" className="feature-card">
            <div className="feature-icon">04</div>
            <h3>多人 AR 辨識</h3>
            <p>同時辨識多位使用者，顯示 AR 寶箱與個人資訊卡片。</p>
          </Link>
        </div>
      </section>

      <section className="showcase-section">
        <div className="showcase-card ai-showcase">
          <div>
            <span className="showcase-label">AI Quiz Creator</span>
            <h2>PDF / 文字一鍵生成測驗</h2>
            <p>
              老師可以上傳教材 PDF 或貼上重點內容，系統會自動產生題目、
              A/B/C/D 選項與正確答案，並可再手動編輯。
            </p>

            <Link to="/quiz/create" className="home-btn primary narrow">
              開始 AI 出題
            </Link>
          </div>

          <div className="mock-panel">
            <div className="mock-line long"></div>
            <div className="mock-line"></div>
            <div className="mock-option">A. 正確答案</div>
            <div className="mock-option">B. 干擾選項</div>
            <div className="mock-option">C. 干擾選項</div>
            <div className="mock-option">D. 干擾選項</div>
          </div>
        </div>

        <div className="showcase-card ar-showcase">
          <div className="ar-preview">
            <div className="camera-frame">
              <div className="face-dot one"></div>
              <div className="face-dot two"></div>

              <div className="ar-tag one">
                <strong>Simon</strong>
                <span>Treasure Opened</span>
              </div>

              <div className="ar-tag two">
                <strong>Player</strong>
                <span>Recognized</span>
              </div>
            </div>
          </div>

          <div>
            <span className="showcase-label">AR Recognition</span>
            <h2>多人辨識與 AR 互動展示</h2>
            <p>
              使用 Camera 頁面偵測多張臉，後端批次比對使用者資料，
              前端只顯示公開資訊與 AR 互動效果。
            </p>

            <Link to="/camera" className="home-btn secondary narrow">
              開啟 AR Camera
            </Link>
          </div>
        </div>
      </section>

      <section className="start-section">
        <h2>
          {currentUser
            ? `準備開始了嗎，${currentUser.name || "使用者"}？`
            : "立即開始你的互動測驗體驗"}
        </h2>

        <p>
          從 AI 建立題目、主持遊戲到 AR 互動辨識，AR Vision Link
          將測驗流程整合成一個完整平台。
        </p>

        <div className="start-actions">
          {currentUser ? (
            <>
              <Link to="/quiz/create" className="home-btn primary">
                建立測驗
              </Link>

              <Link to="/quiz/join" className="home-btn secondary">
                加入測驗
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="home-btn primary">
                建立帳號
              </Link>

              <Link to="/face-login" className="home-btn secondary">
                臉部登入
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;