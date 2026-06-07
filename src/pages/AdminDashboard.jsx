import { useEffect, useMemo, useState } from "react";

const TABLES = [
  { key: "users", label: "Users" },
  { key: "quizzes", label: "Quizzes" },
  { key: "questions", label: "Questions" },
  { key: "game_sessions", label: "Game Sessions" },
  { key: "player_answers", label: "Player Answers" },
];

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#f3f4f6",
    paddingTop: "90px",
    boxSizing: "border-box",
  },
  sidebar: {
    width: "240px",
    background: "#0f172a",
    color: "#fff",
    padding: "1.25rem 1rem",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    position: "sticky",
    top: "90px",
    height: "calc(100vh - 90px)",
  },
  sidebarTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    marginBottom: "1rem",
  },
  sidebarMenu: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sidebarButton: {
    textAlign: "left",
    padding: "0.85rem 1rem",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: "0.95rem",
  },
  sidebarButtonActive: {
    background: "#2563eb",
  },
  main: {
    flex: 1,
    padding: "2rem",
    minWidth: 0,
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    gap: "1rem",
    flexWrap: "wrap",
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.95rem",
  },
  refreshButton: {
    padding: "0.7rem 1rem",
    border: "none",
    borderRadius: "10px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
  panel: {
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  },
  tableWrap: {
    overflowX: "auto",
    maxHeight: "68vh",
    overflowY: "auto",
    borderRadius: "14px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "980px",
  },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "#f9fafb",
    textAlign: "left",
    padding: "0.95rem 1rem",
    borderBottom: "1px solid #e5e7eb",
    color: "#374151",
    fontSize: "0.9rem",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "0.95rem 1rem",
    borderBottom: "1px solid #f1f5f9",
    color: "#111827",
    fontSize: "0.92rem",
    verticalAlign: "top",
    background: "#fff",
  },
  tdMuted: {
    color: "#6b7280",
  },
  actionCell: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  editButton: {
    padding: "0.45rem 0.8rem",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
  deleteButton: {
    padding: "0.45rem 0.8rem",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
  cancelButton: {
    padding: "0.45rem 0.8rem",
    border: "none",
    borderRadius: "8px",
    background: "#6b7280",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
  statusTrue: {
    display: "inline-block",
    padding: "0.25rem 0.55rem",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "0.8rem",
    fontWeight: "700",
  },
  statusFalse: {
    display: "inline-block",
    padding: "0.25rem 0.55rem",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: "0.8rem",
    fontWeight: "700",
  },
  formPanel: {
    marginTop: "1.5rem",
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    padding: "1.25rem",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  },
  formTitle: {
    margin: "0 0 1rem 0",
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#111827",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
  },
  label: {
    fontSize: "0.9rem",
    color: "#374151",
    fontWeight: "600",
  },
  input: {
    padding: "0.75rem 0.85rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    outline: "none",
  },
  textarea: {
    padding: "0.75rem 0.85rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    outline: "none",
    resize: "vertical",
  },
  checkboxRow: {
    display: "flex",
    gap: "1.5rem",
    marginTop: "0.5rem",
    flexWrap: "wrap",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.95rem",
    color: "#111827",
  },
  formActions: {
    marginTop: "1.2rem",
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  saveButton: {
    padding: "0.7rem 1rem",
    border: "none",
    borderRadius: "10px",
    background: "#059669",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "700",
  },
  alertError: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "0.9rem 1rem",
  },
  empty: {
    padding: "2rem",
    color: "#6b7280",
  },
};

function AdminDashboard() {
  const [selectedTable, setSelectedTable] = useState("users");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    nickname: "",
    description: "",
    role: "",
    admin: false,
    is_active: true,
  });

  const columns = useMemo(() => {
    if (!rows.length) return [];
    const base = Object.keys(rows[0]);
    if (selectedTable === "users") {
      return [
        "id",
        "name",
        "nickname",
        "role",
        "admin",
        "is_active",
        "created_at",
      ].filter((key) => base.includes(key));
    }
    return base;
  }, [rows, selectedTable]);

  const fetchTableData = async (tableName) => {
    try {
      setLoading(true);
      setError("");
      setEditingId(null);

      const url =
        tableName === "users"
          ? "http://localhost:3001/api/admin/users"
          : `http://localhost:3001/api/admin/${tableName}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`無法取得 ${tableName} 資料`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `取得 ${tableName} 失敗`);
      }

      if (tableName === "users") {
        setRows(data.users || []);
      } else {
        setRows(data.rows || []);
      }
    } catch (err) {
      console.error(`載入 ${tableName} 失敗:`, err);
      setError(err.message || "載入失敗");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable]);

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || "",
      nickname: user.nickname || "",
      description: user.description || "",
      role: user.role || "",
      admin: !!user.admin,
      is_active: !!user.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      nickname: "",
      description: "",
      role: "",
      admin: false,
      is_active: true,
    });
  };

  const handleUpdate = async (id) => {
    try {
      setSaving(true);
      setError("");

      const response = await fetch(`http://localhost:3001/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "更新失敗");
      }

      await fetchTableData("users");
      cancelEdit();
    } catch (err) {
      console.error("更新 user 失敗:", err);
      setError(err.message || "更新失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("確定要刪除這位使用者嗎？");
    if (!ok) return;

    try {
      setError("");

      const response = await fetch(`http://localhost:3001/api/admin/users/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "刪除失敗");
      }

      await fetchTableData("users");
    } catch (err) {
      console.error("刪除 user 失敗:", err);
      setError(err.message || "刪除失敗");
    }
  };

  const renderCell = (row, col) => {
    if (col === "admin" || col === "is_active") {
      return (
        <span style={row[col] ? styles.statusTrue : styles.statusFalse}>
          {row[col] ? "True" : "False"}
        </span>
      );
    }

    if (typeof row[col] === "object" && row[col] !== null) {
      return JSON.stringify(row[col]);
    }

    const value = row[col];
    if (value === null || value === undefined || value === "") {
      return <span style={styles.tdMuted}>-</span>;
    }

    return String(value);
  };

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTitle}>Admin Panel</div>

        <div style={styles.sidebarMenu}>
          {TABLES.map((table) => (
            <button
              key={table.key}
              onClick={() => setSelectedTable(table.key)}
              style={{
                ...styles.sidebarButton,
                ...(selectedTable === table.key ? styles.sidebarButtonActive : {}),
              }}
            >
              {table.label}
            </button>
          ))}
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.titleBlock}>
            <h1 style={styles.title}>管理員後台</h1>
            <p style={styles.subtitle}>
              目前資料表：{selectedTable}
            </p>
          </div>

          <button
            onClick={() => fetchTableData(selectedTable)}
            style={styles.refreshButton}
          >
            重新整理
          </button>
        </div>

        {error && <div style={styles.alertError}>錯誤：{error}</div>}

        <div style={{ height: error ? "1rem" : 0 }} />

        {loading ? (
          <div style={{ ...styles.panel, ...styles.empty }}>載入中...</div>
        ) : rows.length === 0 ? (
          <div style={{ ...styles.panel, ...styles.empty }}>目前沒有資料</div>
        ) : (
          <div style={styles.panel}>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col} style={styles.th}>
                        {col}
                      </th>
                    ))}

                    {selectedTable === "users" && (
                      <th style={styles.th}>actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={row.id || rowIndex}>
                      {columns.map((col) => (
                        <td key={col} style={styles.td}>
                          {renderCell(row, col)}
                        </td>
                      ))}

                      {selectedTable === "users" && (
                        <td style={styles.td}>
                          <div style={styles.actionCell}>
                            <button
                              onClick={() => startEdit(row)}
                              style={styles.editButton}
                            >
                              編輯
                            </button>

                            <button
                              onClick={() => handleDelete(row.id)}
                              style={styles.deleteButton}
                            >
                              刪除
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTable === "users" && editingId !== null && (
          <div style={styles.formPanel}>
            <h2 style={styles.formTitle}>編輯使用者 #{editingId}</h2>

            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>姓名</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>暱稱</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nickname: e.target.value })
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>角色</label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>描述</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  style={styles.textarea}
                />
              </div>
            </div>

            <div style={styles.checkboxRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={editForm.admin}
                  onChange={(e) =>
                    setEditForm({ ...editForm, admin: e.target.checked })
                  }
                />
                管理員
              </label>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_active: e.target.checked })
                  }
                />
                啟用中
              </label>
            </div>

            <div style={styles.formActions}>
              <button
                onClick={() => handleUpdate(editingId)}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? "儲存中..." : "儲存變更"}
              </button>

              <button onClick={cancelEdit} style={styles.cancelButton}>
                取消
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;