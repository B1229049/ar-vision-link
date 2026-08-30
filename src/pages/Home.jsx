import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/Home.css";

function ShopIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M15 25h34l-3 28H18l-3-28Z" />
      <path d="M23 27v-7a9 9 0 0 1 18 0v7" />
      <path d="m32 33 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2-4.5-4.4 6.2-.9L32 33Z" />
    </svg>
  );
}

function RoomDissolvedNotice({ visible, onClose }) {
  if (!visible) return null;
  return (
    <button type="button" className="room-dissolved-notice-layer" onClick={onClose} aria-label="關閉房間解散通知">
      <span className="room-dissolved-notice">房主已解散房間</span>
    </button>
  );
}

const landingFeatures = [
  ["Live AR Game", "多人即時同步、手勢答題競賽"],
  ["AI Quiz Lab", "可用 AI 將文字、PDF、TXT 轉換成題目"],
  ["AR Camera", "搭配濾鏡、3D 特效進行自拍"],
  ["收集式要素", "收集各式各樣的'虛擬替身'造型"],
];

function LoggedOutLanding() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-grid-bg" aria-hidden="true" />
        <div className="landing-hero-copy">
          <h1>讓每一次學習，<em>都有身分與互動。</em></h1>
          <p>一個身分，連結 AI 出題、多人即時競賽、AR 鏡頭、自拍創作與虛擬替身。讓每一次參與，都能被看見、即時回應，也留下自己的學習足跡。</p>
          <Link className="landing-pill primary" to="/register">建立你的身分 →</Link>
        </div>
        <div className="landing-feature-list" aria-label="AR Vision Link 產品功能">
          {landingFeatures.map(([title, description]) => (
            <article className="landing-feature-card" key={title}>
              <div><h2>{title}</h2><p>{description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section participation-section">
        <h2 className="landing-heading">不是功能清單，而是一個持續參與的循環。</h2>
        <p className="landing-intro">從建立身分開始，使用者可以創作、競賽、被辨識，再把每次活動累積成個人紀錄。</p>
        <div className="participation-steps">
          <article><span>01</span><h3>建立身分</h3><p>臉部註冊與登入，連結個人資料和虛擬替身。</p></article>
          <article><span>02</span><h3>創作內容</h3><p>AI 或手動建立題目，管理自己的測驗庫。</p></article>
          <article><span>03</span><h3>進入互動</h3><p>普通、AR 或自由選擇模式，即時加入房間。</p></article>
          <article><span>04</span><h3>累積歷程</h3><p>可瀏覽得分、排行、答案和主持紀錄。</p></article>
        </div>
      </section>

      <section className="landing-band create-band">
        <div className="landing-split">
          <div className="landing-copy"><h2 className="landing-heading">一份教材，幾分鐘變成一場遊戲。</h2><p className="landing-intro">貼上文字或上傳 PDF／TXT，由 AI 建立四選一題目；老師仍保有完整編輯權。</p></div>
          <div className="quiz-creator-preview" aria-label="AI 建立測驗介面示意">
            <header><strong>QUIZ CENTER</strong></header>
            <div className="quiz-preview-body">
              <aside><strong>建立方式</strong><span>手動建立</span><span>貼上文字</span><span>上傳教材</span><span>AI 生成</span></aside>
              <div className="quiz-preview-main">
                <div className="quiz-file">教材檔案：ComputerScience.pdf</div>
                <div className="quiz-generating">✦ 正在從教材產生 5 道題目...</div>
                <div className="quiz-question"><strong>Q1 · 被稱為「電腦的大腦」，負責處理資料與執行指令的核心硬體是下列哪一個？</strong><div><span className="correct">A · 中央處理器 (CPU)</span><span>B · 固態硬碟 (SSD)</span><span>C · 滑鼠 (Mouse)</span><span>D · 顯示卡 (GPU)</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band play-band">
        <div className="landing-split">
          <div className="landing-copy"><h2 className="landing-heading">不只按答案，直接在鏡頭裡作答。</h2><p className="landing-intro">AR 模式透過手部追蹤辨識指向位置，題目、倒數、分數與排行都疊加在真實畫面上；主持端同步看到玩家狀況。</p></div>
          <div className="landing-media-placeholder dark" aria-label="AR 答題圖片預留區" />
        </div>
      </section>

      <section className="landing-section identity-section">
        <div className="landing-split">
          <div className="landing-copy"><h2 className="landing-heading">身分不是帳號欄位，而是整個體驗的入口。</h2><p className="landing-intro">從臉部登入到多人 AR Camera，讓公開資訊、虛擬替身與活動成果跟著使用者出現在現場。</p></div>
          <article className="identity-preview">
            <h3>一個身分，連結所有歷程</h3><p>個人資料、虛擬替身、測驗成績與臉部資料維持在同一個使用者身分下。</p>
            <div className="identity-profile"><div className="identity-avatar" aria-hidden="true" /><div className="identity-data"><strong>個人資料</strong><span>名稱 · 李田所</span><span>暱稱 · 田同學</span><span>使用者ID · 114</span><span>個人介紹 · 嗨!一庫走</span></div></div>
          </article>
        </div>
      </section>

      <section className="landing-band expression-band">
        <div className="landing-split">
          <div className="landing-copy"><h2 className="landing-heading">留下自己的風格。</h2><p className="landing-intro">可為自己的虛擬替身搭配各種服裝，各式各樣的造型等你來收集。</p></div>
          <div className="landing-media-placeholder light" aria-label="Avatar 圖片預留區" />
        </div>
      </section>

      <section className="landing-band progress-band">
        <div className="landing-split progress-split">
          <div className="landing-copy"><h2 className="landing-heading">每次參與，都成為下一次進步的線索。</h2><p className="landing-intro">玩家能查看分數、答案與場次；主持人能回看排行榜、所有玩家作答紀錄與題目表現。</p></div>
          <div className="history-preview">
            <div className="history-tabs"><span>玩家紀錄</span><span>主持紀錄</span></div>
            {[["#1", "資料結構隨堂小考", "答對 10 / 10 題", "9,990 分"], ["#9", "計算機網路即時測驗", "答對 7 / 10 題", "7,120 分"], ["#2", "os小考", "答對 9 / 12 題", "9,330 分"]].map(([rank, title, detail, score]) => (
              <div className="history-row" key={title}><span className="history-rank">{rank}</span><div><strong>{title}</strong><small>{detail}</small></div><b>{score}</b></div>
            ))}
          </div>
        </div>
      </section>

      <section className="privacy-section">
        <div><h2>臉部辨識帶來方便，且保護使用者個資。</h2></div>
        <div className="privacy-list">
          <article><b>01</b><div><strong>後端進行身分比對</strong><span>前端不取得其他使用者的臉部特徵資料。</span></div></article>
          <article><b>02</b><div><strong>公開資訊與生物特徵分離</strong><span>鏡頭畫面只呈現允許公開的個人資訊。</span></div></article>
          <article><b>03</b><div><strong>使用者可以重新註冊</strong><span>提供更新臉部資料的明確入口。</span></div></article>
        </div>
      </section>

      <section className="landing-cta"><h2>進入你的<br />AR 互動世界。</h2><p>從建立身分開始，創造第一場即時體驗。</p><Link to="/register">建立帳號 →</Link></section>
      <footer className="landing-footer">2026 AR Vision Link</footer>
    </main>
  );
}

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser] = useState(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("currentUser");
      return null;
    }
  });
  const [quickRoomCode, setQuickRoomCode] = useState("");
  const [showRoomDissolvedNotice, setShowRoomDissolvedNotice] = useState(Boolean(location.state?.roomDissolved));

  useEffect(() => {
    if (!location.state?.roomDissolved) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  function handleQuickJoin(event) {
    event.preventDefault();
    const roomCode = quickRoomCode.trim().toUpperCase();
    if (roomCode) navigate(`/quiz/join?room=${encodeURIComponent(roomCode)}`);
  }

  const notice = <RoomDissolvedNotice visible={showRoomDissolvedNotice} onClose={() => setShowRoomDissolvedNotice(false)} />;
  if (!currentUser) return <>{notice}<LoggedOutLanding /></>;

  return (
    <div className="home-page logged-in-home">
      {notice}
      <section className="home-hero"><div className="hero-left"><h1>AR Vision Link</h1><div className="home-player-hub">
        <form className="home-quick-join" onSubmit={handleQuickJoin}><label htmlFor="quick-room-code">快速加入房間</label><div className="quick-join-row"><input id="quick-room-code" value={quickRoomCode} onChange={(event) => setQuickRoomCode(event.target.value.toUpperCase())} placeholder="輸入房號" maxLength={12} /><button type="submit" disabled={!quickRoomCode.trim()}>加入</button></div></form>
        <button type="button" className="home-shop-button" onClick={() => navigate("/store")}><span className="shop-icon-wrap"><ShopIcon /></span><span className="shop-button-copy"><strong>商城</strong><small>探索「虛擬替身」時裝與限定造型</small></span></button>
        <section className="home-news-banner" aria-label="最新消息"><div className="news-badge"><strong>最新消息</strong></div></section>
        <section className="home-news-banner" aria-label="信件"><div className="news-badge"><strong>信件</strong></div></section>
      </div></div></section>
    </div>
  );
}

export default Home;
