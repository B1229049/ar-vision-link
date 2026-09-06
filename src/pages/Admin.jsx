import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import "../styles/Admin.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";
const COIN_OPTIONS = [50, 100, 200, 300];
const SUPABASE_USAGE_URL = "https://supabase.com/dashboard/org/_/usage";
const ADMIN_TABLES = [
  ["users", "Users"],
  ["quizzes", "Quizzes"],
  ["questions", "Questions"],
  ["game_sessions", "Game Sessions"],
  ["player_records", "Player Records"],
  ["player_answers", "Player Answers"],
  ["coin_rewards", "Coin Rewards"],
  ["coin_reward_claims", "Reward Claims"],
  ["user_face_images", "Face Images"],
  ["user_face_embeddings", "Face Embeddings"],
  ["vision_sessions", "Vision Sessions"],
  ["vision_detection_logs", "Vision Logs"],
  ["avatar_item_settings", "Avatar Settings"],
];

async function fetchOverview(adminUserId) {
  const response = await fetch(`${BACKEND_URL}/api/admin/overview?admin_id=${adminUserId}`);
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || "無法讀取系統總覽");
  return result.overview;
}

function dateInputValue(date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function localDateFromValue(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthKey(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

function formatBytes(value) {
  if (value == null) return "尚未取得";
  const units = ["B", "KB", "MB", "GB"];
  let amount = Math.max(Number(value) || 0, 0);
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
}

function ResourceCard({ label, used, limit, unavailable, children }) {
  const percent = used == null ? 0 : Math.min((used / limit) * 100, 100);
  return (
    <article className="admin-resource-card">
      <span>{label}</span>
      {children || <>
        <strong>{unavailable ? "—" : formatBytes(Math.max(limit - used, 0))}</strong>
        <small>{unavailable ? unavailable : `已使用 ${formatBytes(used)}／額度 ${formatBytes(limit)}`}</small>
        {!unavailable && <div className="admin-resource-progress"><i style={{ width: `${percent}%` }} /></div>}
      </>}
    </article>
  );
}

function RewardCalendar({ value, min, max, onChange, onClose }) {
  const minDate = localDateFromValue(min);
  const maxDate = localDateFromValue(max);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = localDateFromValue(value);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const lastDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const cells = [];
  for (let blank = 0; blank < firstDay.getDay(); blank += 1) cells.push(null);
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
  }
  const canGoPrevious = monthKey(visibleMonth) > monthKey(minDate);
  const canGoNext = monthKey(visibleMonth) < monthKey(maxDate);

  return (
    <div className="admin-calendar" role="dialog" aria-label="選擇截止日期">
      <header>
        <button type="button" disabled={!canGoPrevious} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} aria-label="上個月">‹</button>
        <strong>{visibleMonth.getFullYear()} 年 {visibleMonth.getMonth() + 1} 月</strong>
        <button type="button" disabled={!canGoNext} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} aria-label="下個月">›</button>
      </header>
      <div className="admin-calendar-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="admin-calendar-days">
        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />;
          const dateValue = dateInputValue(date);
          const disabled = dateValue < min || dateValue > max;
          return <button key={dateValue} type="button" className={dateValue === value ? "selected" : ""} disabled={disabled} onClick={() => { onChange(dateValue); onClose(); }}>{date.getDate()}</button>;
        })}
      </div>
    </div>
  );
}

function SidebarIcon({ name }) {
  if (name === "overview") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>;
  }
  return name === "reward" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.8 4 5.4S5.1 3 6.6 3C9 3 12 8 12 8s3-5 5.4-5C18.9 3 20 4 20 5.4S19 8 16.5 8" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></svg>
  );
}

function Admin() {
  const adminUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "null"); }
    catch { return null; }
  }, []);
  const adminUserId = adminUser?.id;
  const [view, setView] = useState("overview");
  const [tablesExpanded, setTablesExpanded] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableRows, setTableRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");
  const [rewardCoins, setRewardCoins] = useState(100);
  const [rewardDate, setRewardDate] = useState(dateInputValue(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [rewardImage, setRewardImage] = useState("");
  const [rewardUrl, setRewardUrl] = useState("");
  const [creatingReward, setCreatingReward] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [rewardMessage, setRewardMessage] = useState("");
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const minRewardDate = dateInputValue(new Date());
  const maxRewardDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return dateInputValue(date);
  }, []);

  async function loadRewards() {
    if (!adminUserId) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/rewards?admin_id=${adminUserId}`);
      const result = await response.json();
      if (response.ok && result.success) setRewards(result.rewards || []);
    } catch (err) {
      console.warn("無法取得獎勵紀錄：", err);
    }
  }

  async function loadOverview() {
    if (!adminUserId) return;
    setOverviewLoading(true);
    setOverviewError("");
    try {
      setOverview(await fetchOverview(adminUserId));
    } catch (err) {
      setOverviewError(err.message);
    } finally {
      setOverviewLoading(false);
    }
  }

  useEffect(() => {
    if (!adminUserId) return undefined;
    let cancelled = false;
    fetchOverview(adminUserId)
      .then((data) => { if (!cancelled) setOverview(data); })
      .catch((err) => { if (!cancelled) setOverviewError(err.message); })
      .finally(() => { if (!cancelled) setOverviewLoading(false); });
    return () => { cancelled = true; };
  }, [adminUserId]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      if (!adminUserId) return;
      try {
        const response = await fetch(`${BACKEND_URL}/api/admin/rewards?admin_id=${adminUserId}`);
        const result = await response.json();
        if (!cancelled && response.ok && result.success) setRewards(result.rewards || []);
      } catch (err) {
        if (!cancelled) console.warn("無法取得獎勵紀錄：", err);
      }
    }
    initialize();
    return () => { cancelled = true; };
  }, [adminUserId]);

  async function loadTable(table) {
    setSelectedTable(table);
    setView("database");
    setTableLoading(true);
    setTableError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/${table}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "讀取失敗");
      setTableRows(result.rows || result.users || []);
    } catch (err) {
      setTableRows([]);
      setTableError(err.message);
    } finally {
      setTableLoading(false);
    }
  }

  async function createReward(event) {
    event.preventDefault();
    if (rewardDate < minRewardDate || rewardDate > maxRewardDate) return;
    setCreatingReward(true);
    setRewardMessage("");
    try {
      const expiry = new Date(`${rewardDate}T23:59:00`);
      const response = await fetch(`${BACKEND_URL}/api/admin/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins: Number(rewardCoins), expires_at: expiry.toISOString(), created_by: adminUserId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "建立獎勵失敗");
      const url = `${window.location.origin}${import.meta.env.BASE_URL}?reward=${result.reward.token}`;
      const image = await QRCode.toDataURL(url, {
        width: 900,
        margin: 3,
        errorCorrectionLevel: "H",
        color: { dark: "#0a2540", light: "#ffffff" },
      });
      setRewardUrl(url);
      setRewardImage(image);
      setRewardMessage("獎勵 QR Code 已建立");
      loadRewards();
    } catch (err) {
      setRewardMessage(err.message);
    } finally {
      setCreatingReward(false);
    }
  }

  function downloadRewardImage() {
    const link = document.createElement("a");
    link.href = rewardImage;
    link.download = `coin-reward-${rewardCoins}-${rewardDate}.png`;
    link.click();
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand"><strong>Admin Center</strong></div>
        <nav>
          <button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}><SidebarIcon name="overview" /><span>總覽</span></button>
          <button className={view === "rewards" ? "active" : ""} onClick={() => setView("rewards")}><SidebarIcon name="reward" /><span>派發獎勵</span></button>
          <button className={`admin-database-toggle ${view === "database" ? "active" : ""}`} onClick={() => setTablesExpanded((open) => !open)} aria-expanded={tablesExpanded}><SidebarIcon name="database" /><span>資料表</span><b aria-hidden="true">⌄</b></button>
          {tablesExpanded && <div className="admin-table-menu">{ADMIN_TABLES.map(([key, name]) => <button key={key} className={selectedTable === key ? "active" : ""} onClick={() => loadTable(key)}>{name}</button>)}</div>}
        </nav>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div><h1>{view === "overview" ? "總覽" : view === "rewards" ? "派發獎勵" : selectedTable ? ADMIN_TABLES.find(([key]) => key === selectedTable)?.[1] : "資料表"}</h1></div><span className="admin-status">系統運作中</span></header>

        {view === "overview" && <section className="admin-overview">
          <div className="admin-overview-heading"><div><h2>Supabase 資源</h2><p>空間為即時估算；月流量請以 Supabase 官方 Usage 結算資料為準。</p></div><button type="button" onClick={loadOverview} disabled={overviewLoading}>{overviewLoading ? "更新中…" : "重新整理"}</button></div>
          {overviewError && <p className="admin-error">{overviewError}</p>}
          <div className="admin-resource-grid">
            <ResourceCard label="使用者總數"><strong>{overviewLoading ? "—" : Number(overview?.user_count || 0).toLocaleString()}</strong><small>目前 users 資料表中的帳號數量</small></ResourceCard>
            <ResourceCard label="資料庫剩餘空間" used={overview?.database?.used_bytes} limit={overview?.database?.limit_bytes || 524288000} unavailable={overviewLoading ? "載入中…" : overview?.database?.used_bytes == null ? "需在 Supabase 執行專案附帶的統計 SQL" : ""} />
            <ResourceCard label="Storage 剩餘空間" used={overview?.storage?.used_bytes} limit={overview?.storage?.limit_bytes || 1073741824} unavailable={overviewLoading ? "載入中…" : overview?.storage?.used_bytes == null ? "需在 Supabase 執行專案附帶的統計 SQL" : ""} />
            <ResourceCard label="本月傳輸流量"><strong>5 GB 額度</strong><small>Supabase 未向 service-role 提供帳務流量；請由官方 Usage 查看實際剩餘量</small></ResourceCard>
          </div>
          <a className="admin-usage-link" href={SUPABASE_USAGE_URL} target="_blank" rel="noreferrer">開啟 Supabase Usage 查看流量與完整用量</a>
        </section>}

        {view === "rewards" && <div className="admin-reward-layout">
          <section className="admin-panel reward-form-panel"><div className="admin-panel-heading"><div><h2>建立金幣獎勵</h2><p>每個帳號對同一個 QR Code 僅能領取一次</p></div></div><form onSubmit={createReward}><label>派發金幣<select value={rewardCoins} onChange={(e) => setRewardCoins(e.target.value)}>{COIN_OPTIONS.map((value) => <option key={value} value={value}>{value} 金幣</option>)}</select></label><div className="admin-date-field"><span>截止日期</span><button type="button" className="admin-date-trigger" onClick={() => setCalendarOpen((open) => !open)} aria-expanded={calendarOpen}>{localDateFromValue(rewardDate).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}<b aria-hidden="true">▾</b></button>{calendarOpen && <RewardCalendar value={rewardDate} min={minRewardDate} max={maxRewardDate} onChange={setRewardDate} onClose={() => setCalendarOpen(false)} />}<small>有效至當日 23:59，僅能選擇 5 天內日期</small></div><button className="admin-primary-button" disabled={creatingReward}>{creatingReward ? "建立中…" : "產生 QR Code"}</button>{rewardMessage && <p className="reward-message">{rewardMessage}</p>}</form></section>
          <section className="admin-panel reward-preview-panel"><div className="admin-panel-heading"><div><h2>QR Code 預覽</h2><p>可直接下載 PNG 圖片</p></div></div>{rewardImage ? <><img src={rewardImage} alt={`${rewardCoins} 金幣獎勵 QR Code`} /><code>{rewardUrl}</code><button className="admin-primary-button" onClick={downloadRewardImage}>下載 QR 圖片</button></> : <div className="reward-placeholder"><SidebarIcon name="reward" /><p>設定獎勵後，QR Code 將顯示在這裡</p></div>}</section>
          <section className="admin-panel reward-history"><div className="admin-panel-heading"><div><h2>最近建立</h2><p>最近 30 筆獎勵</p></div></div><div className="reward-history-list">{rewards.map((reward) => <article key={reward.id}><strong>{reward.coins} 金幣</strong><span>截止 {new Date(reward.expires_at).toLocaleString("zh-TW")}</span><small>{reward.coin_reward_claims?.[0]?.count || 0} 人已領取</small></article>)}</div></section>
        </div>}

        {view === "database" && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{selectedTable || "資料表內容"}</h2><p>{selectedTable ? "目前資料表的即時內容" : "請從左側展開並選擇資料表"}</p></div></div>{tableError && <p className="admin-error">{tableError}</p>}{tableLoading ? <p>載入中…</p> : tableRows.length ? <div className="admin-data-table-wrapper"><table className="admin-table"><thead><tr>{Object.keys(tableRows[0]).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{tableRows.map((row, index) => <tr key={index}>{Object.keys(tableRows[0]).map((key) => <td key={key}>{row[key] == null ? "—" : typeof row[key] === "object" ? JSON.stringify(row[key]) : String(row[key])}</td>)}</tr>)}</tbody></table></div> : <div className="admin-empty">尚未載入資料</div>}</section>}
      </section>
    </main>
  );
}

export default Admin;
