import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import "../styles/Admin.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";
const COIN_OPTIONS = [50, 100, 200, 300, 1000];
const ADMIN_TABLES = [
  ["quizzes", "Quizzes"],
  ["questions", "Questions"],
  ["game_sessions", "Game Sessions"],
  ["player_records", "Player Records"],
  ["player_answers", "Player Answers"],
  ["coin_rewards", "Coin Rewards"],
  ["coin_reward_claims", "Reward Claims"],
  ["vision_sessions", "Vision Sessions"],
  ["vision_detection_logs", "Vision Logs"],
  ["avatar_item_settings", "Avatar Settings"],
];

function dateInputValue(date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function AdminIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    reward: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.8 4 5.4S5.1 3 6.6 3C9 3 12 8 12 8s3-5 5.4-5C18.9 3 20 4 20 5.4S19 8 16.5 8" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Admin() {
  const adminUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "null"); }
    catch { return null; }
  }, []);
  const [view, setView] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTable, setSelectedTable] = useState("quizzes");
  const [tableRows, setTableRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [rewardCoins, setRewardCoins] = useState(100);
  const [rewardDate, setRewardDate] = useState(dateInputValue(new Date()));
  const [rewardImage, setRewardImage] = useState("");
  const [rewardUrl, setRewardUrl] = useState("");
  const [creatingReward, setCreatingReward] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [rewardMessage, setRewardMessage] = useState("");
  const adminUserId = adminUser?.id;

  const maxRewardDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return dateInputValue(date);
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/users`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "無法取得使用者資料");
      setUsers(result.users || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRewards() {
    if (!adminUser?.id) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/rewards?admin_id=${adminUser.id}`);
      const result = await response.json();
      if (response.ok && result.success) setRewards(result.rewards || []);
    } catch (err) {
      console.warn("無法取得獎勵紀錄：", err);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const [usersResponse, rewardsResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/api/admin/users`),
          adminUserId
            ? fetch(`${BACKEND_URL}/api/admin/rewards?admin_id=${adminUserId}`)
            : Promise.resolve(null),
        ]);
        const usersResult = await usersResponse.json();
        const rewardsResult = rewardsResponse ? await rewardsResponse.json() : null;
        if (cancelled) return;
        if (!usersResponse.ok || !usersResult.success) {
          throw new Error(usersResult.error || "無法取得使用者資料");
        }
        setUsers(usersResult.users || []);
        if (rewardsResponse?.ok && rewardsResult?.success) {
          setRewards(rewardsResult.rewards || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();
    return () => { cancelled = true; };
  }, [adminUserId]);

  function beginEdit(user) {
    if (user.admin) return alert("管理員帳號不可編輯");
    setEditingId(user.id);
    setEditData({
      name: user.name || "",
      nickname: user.nickname || "",
      description: user.description || "",
      is_active: user.is_active,
      admin: user.admin,
    });
  }

  async function saveUser(user) {
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    const result = await response.json();
    if (!response.ok || !result.success) return alert(result.error || "更新失敗");
    setUsers((items) => items.map((item) => item.id === user.id ? result.user : item));
    setEditingId(null);
  }

  async function deleteUser(user) {
    if (user.admin || !window.confirm(`確定刪除「${user.name}」？`)) return;
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${user.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.success) return alert(result.error || "刪除失敗");
    setUsers((items) => items.filter((item) => item.id !== user.id));
  }

  async function loadTable(table) {
    setSelectedTable(table);
    setTableLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/${table}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "讀取失敗");
      setTableRows(result.rows || []);
    } catch (err) {
      setTableRows([]);
      alert(err.message);
    } finally {
      setTableLoading(false);
    }
  }

  async function createReward(event) {
    event.preventDefault();
    setCreatingReward(true);
    setRewardMessage("");
    try {
      const localExpiry = new Date(`${rewardDate}T23:59:00`);
      const response = await fetch(`${BACKEND_URL}/api/admin/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coins: Number(rewardCoins),
          expires_at: localExpiry.toISOString(),
          created_by: adminUser.id,
        }),
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

  const activeUsers = users.filter((user) => user.is_active).length;
  const totalCoins = users.reduce((sum, user) => sum + (Number(user.coins) || 0), 0);

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span>AV</span><div><strong>Admin Center</strong><small>管理員工作區</small></div></div>
        <nav>
          {[["dashboard", "dashboard", "總覽"], ["users", "users", "使用者"], ["rewards", "reward", "派發獎勵"], ["database", "database", "資料表"]].map(([key, icon, label]) => (
            <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>
              <AdminIcon name={icon} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-account"><span>{adminUser?.name?.slice(0, 1) || "A"}</span><div><strong>{adminUser?.name || "Admin"}</strong><small>Administrator</small></div></div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div><small>ADMIN CENTER</small><h1>{view === "dashboard" ? "儀表板" : view === "users" ? "使用者管理" : view === "rewards" ? "派發獎勵" : "資料表瀏覽"}</h1></div><span className="admin-status">系統運作中</span></header>

        {view === "dashboard" && <>
          <div className="admin-metrics">
            <article><span>使用者總數</span><strong>{users.length}</strong><small>{activeUsers} 位使用中</small></article>
            <article><span>系統金幣總量</span><strong>{totalCoins.toLocaleString()}</strong><small>所有帳號持有量</small></article>
            <article><span>已建立獎勵</span><strong>{rewards.length}</strong><small>最近 30 筆內</small></article>
          </div>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>快速操作</h2><p>管理平台常用功能</p></div></div><div className="admin-quick-actions"><button onClick={() => setView("users")}><AdminIcon name="users" /><strong>管理使用者</strong><span>查看帳號與狀態</span></button><button onClick={() => setView("rewards")}><AdminIcon name="reward" /><strong>建立獎勵 QR</strong><span>設定金幣與期限</span></button><button onClick={() => setView("database")}><AdminIcon name="database" /><strong>瀏覽資料表</strong><span>檢視系統原始資料</span></button></div></section>
        </>}

        {view === "users" && <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>使用者</h2><p>{loading ? "載入中…" : `${users.length} 個帳號`}</p></div><button onClick={loadUsers}>重新整理</button></div>
          {error ? <p className="admin-error">{error}</p> : <div className="admin-data-table-wrapper"><table className="admin-table"><thead><tr><th>ID</th><th>名稱</th><th>暱稱</th><th>金幣</th><th>狀態</th><th>權限</th><th>操作</th></tr></thead><tbody>{users.map((user) => {
            const editing = editingId === user.id;
            return <tr key={user.id}><td>#{user.id}</td><td>{editing ? <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /> : user.name}</td><td>{editing ? <input value={editData.nickname} onChange={(e) => setEditData({ ...editData, nickname: e.target.value })} /> : user.nickname || "—"}</td><td>{Number(user.coins || 0).toLocaleString()}</td><td><span className={`admin-chip ${user.is_active ? "success" : "muted"}`}>{user.is_active ? "啟用" : "停用"}</span></td><td>{user.admin ? "管理員" : "一般使用者"}</td><td className="admin-row-actions">{editing ? <><button onClick={() => saveUser(user)}>儲存</button><button className="secondary" onClick={() => setEditingId(null)}>取消</button></> : <><button onClick={() => setSelectedUser(user)}>詳細</button>{!user.admin && <><button className="secondary" onClick={() => beginEdit(user)}>編輯</button><button className="danger" onClick={() => deleteUser(user)}>刪除</button></>}</>}</td></tr>;
          })}</tbody></table></div>}
        </section>}

        {view === "rewards" && <div className="admin-reward-layout">
          <section className="admin-panel reward-form-panel"><div className="admin-panel-heading"><div><h2>建立金幣獎勵</h2><p>每個帳號對同一個 QR Code 僅能領取一次</p></div></div><form onSubmit={createReward}><label>派發金幣<select value={rewardCoins} onChange={(e) => setRewardCoins(e.target.value)}>{COIN_OPTIONS.map((value) => <option key={value} value={value}>{value} 金幣</option>)}</select></label><label>截止日期<input type="date" value={rewardDate} min={dateInputValue(new Date())} max={maxRewardDate} onChange={(e) => setRewardDate(e.target.value)} required /><small>有效至當日 23:59，最多選擇五天後</small></label><button className="admin-primary-button" disabled={creatingReward}>{creatingReward ? "建立中…" : "產生 QR Code"}</button>{rewardMessage && <p className="reward-message">{rewardMessage}</p>}</form></section>
          <section className="admin-panel reward-preview-panel"><div className="admin-panel-heading"><div><h2>QR Code 預覽</h2><p>可直接下載 PNG 圖片</p></div></div>{rewardImage ? <><img src={rewardImage} alt={`${rewardCoins} 金幣獎勵 QR Code`} /><code>{rewardUrl}</code><button className="admin-primary-button" onClick={downloadRewardImage}>下載 QR 圖片</button></> : <div className="reward-placeholder"><AdminIcon name="reward" /><p>設定獎勵後，QR Code 將顯示在這裡</p></div>}</section>
          <section className="admin-panel reward-history"><div className="admin-panel-heading"><div><h2>最近建立</h2><p>最近 30 筆獎勵</p></div></div><div className="reward-history-list">{rewards.map((reward) => <article key={reward.id}><strong>{reward.coins} 金幣</strong><span>截止 {new Date(reward.expires_at).toLocaleString("zh-TW")}</span><small>{reward.coin_reward_claims?.[0]?.count || 0} 人已領取</small></article>)}</div></section>
        </div>}

        {view === "database" && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>資料表</h2><p>選擇資料來源並檢視內容</p></div></div><div className="admin-table-tabs">{ADMIN_TABLES.map(([key, name]) => <button key={key} className={selectedTable === key ? "active" : ""} onClick={() => loadTable(key)}>{name}</button>)}</div>{tableLoading ? <p>載入中…</p> : tableRows.length ? <div className="admin-data-table-wrapper"><table className="admin-table"><thead><tr>{Object.keys(tableRows[0]).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{tableRows.map((row, index) => <tr key={index}>{Object.keys(tableRows[0]).map((key) => <td key={key}>{row[key] == null ? "—" : typeof row[key] === "object" ? JSON.stringify(row[key]) : String(row[key])}</td>)}</tr>)}</tbody></table></div> : <div className="admin-empty">選擇資料表以載入內容</div>}</section>}
      </section>

      {selectedUser && <div className="admin-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSelectedUser(null)}><section className="admin-modal"><header><h2>使用者詳細資料</h2><button onClick={() => setSelectedUser(null)}>×</button></header>{[["ID", selectedUser.id], ["名稱", selectedUser.name], ["暱稱", selectedUser.nickname], ["介紹", selectedUser.description], ["金幣", selectedUser.coins || 0], ["持有套裝", selectedUser.owned_outfits?.join(", ") || "無"], ["建立時間", selectedUser.created_at]].map(([label, value]) => <p key={label}><strong>{label}</strong><span>{value || "—"}</span></p>)}</section></div>}
    </main>
  );
}

export default Admin;
