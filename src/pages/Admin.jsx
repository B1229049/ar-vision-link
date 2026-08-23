import "../styles/Admin.css";
import { useEffect, useState } from "react";

const BACKEND_URL = "https://ar-vision-link.onrender.com";

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingId, setSavingId] = useState(null);

  // User 詳細資料
  const [selectedUser, setSelectedUser] = useState(null);

  // 其他資料表
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableRows, setTableRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");

  // 可以查看的資料表
    const ADMIN_TABLES = [
    { key: "quizzes", name: "Quizzes" },
    { key: "questions", name: "Questions" },
    { key: "game_sessions", name: "Game Sessions" },
    { key: "player_records", name: "Player Records" },
    { key: "user_face_images", name: "User Face Images" },
    { key: "user_face_embeddings", name: "User Face Embeddings" },
    { key: "vision_sessions", name: "Vision Sessions" },
    { key: "vision_detection_logs", name: "Vision Detection Logs" },
    { key: "player_answers", name: "Player Answers" },
    { key: "avatar_item_settings", name: "Avatar Item Settings" },
    { key: "ar_selfies", name: "AR Selfies" },
    ];

  // =========================
  // 取得 Users
  // =========================

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${BACKEND_URL}/api/admin/users`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "取得 User 資料失敗"
        );
      }

      setUsers(result.users || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // =========================
  // User 詳細資料
  // =========================

  function handleViewDetails(user) {
    setSelectedUser(user);
  }

  function handleCloseDetails() {
    setSelectedUser(null);
  }

  // =========================
  // 編輯 User
  // =========================

  function handleEdit(user) {
    // 管理員不可編輯
    if (user.admin === true) {
      alert("管理員不能被編輯");
      return;
    }

    setEditingId(user.id);

    setEditData({
      name: user.name || "",
      nickname: user.nickname || "",
      description: user.description || "",
      profile_url: user.profile_url || "",
      is_active: user.is_active,
      admin: user.admin,
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  function handleEditChange(field, value) {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave(user) {
    // 管理員不可修改
    if (user.admin === true) {
      alert("管理員不能被修改");
      return;
    }

    try {
      setSavingId(user.id);

      const response = await fetch(
        `${BACKEND_URL}/api/admin/users/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editData),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "更新失敗"
        );
      }

      setUsers((prevUsers) =>
        prevUsers.map((item) =>
          item.id === user.id
            ? result.user
            : item
        )
      );

      setEditingId(null);
      setEditData({});

      alert(`User「${user.name}」已更新`);
    } catch (err) {
      console.error(err);
      alert(`更新失敗：${err.message}`);
    } finally {
      setSavingId(null);
    }
  }

  // =========================
  // 刪除 User
  // =========================

  async function handleDelete(user) {
    // 管理員不可刪除
    if (user.admin === true) {
      alert("管理員不能被刪除");
      return;
    }

    const confirmed = window.confirm(
      `確定要刪除 User「${user.name}」嗎？`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(user.id);

      const response = await fetch(
        `${BACKEND_URL}/api/admin/users/${user.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "刪除失敗"
        );
      }

      setUsers((prevUsers) =>
        prevUsers.filter(
          (item) => item.id !== user.id
        )
      );

      alert(`User「${user.name}」已刪除`);
    } catch (err) {
      console.error(err);
      alert(`刪除失敗：${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  // =========================
  // 取得其他資料表
  // =========================

  async function loadTable(table) {
    try {
      setSelectedTable(table);
      setTableLoading(true);
      setTableError("");
      setTableRows([]);

      const response = await fetch(
        `${BACKEND_URL}/api/admin/${table}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "取得資料失敗"
        );
      }

      setTableRows(result.rows || []);
    } catch (err) {
      console.error(err);
      setTableError(err.message);
    } finally {
      setTableLoading(false);
    }
  }

  // =========================
  // Render
  // =========================

  return (
    <div className="admin-page">
      <div className="admin-section">

        <h1>管理員介面</h1>

        {/* =========================
            User 管理
        ========================= */}

        <h2>User 管理</h2>

        {loading && (
          <p className="admin-loading">
            載入 User 資料中...
          </p>
        )}

        {error && (
          <p className="admin-error">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <p className="admin-count">
              目前共有 {users.length} 位 User
            </p>

            <div className="admin-data-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Nickname</th>
                    <th>Description</th>
                    <th>Admin</th>
                    <th>Active</th>
                    <th>操作</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isEditing =
                      editingId === user.id;

                    return (
                      <tr key={user.id}>

                        <td>{user.id}</td>

                        <td>
                          {isEditing ? (
                            <input
                              className="admin-input"
                              value={editData.name}
                              onChange={(e) =>
                                handleEditChange(
                                  "name",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            user.name
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="admin-input"
                              value={editData.nickname}
                              onChange={(e) =>
                                handleEditChange(
                                  "nickname",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            user.nickname || "-"
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="admin-input"
                              value={
                                editData.description
                              }
                              onChange={(e) =>
                                handleEditChange(
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            user.description || "-"
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={
                                editData.admin
                              }
                              onChange={(e) =>
                                handleEditChange(
                                  "admin",
                                  e.target.checked
                                )
                              }
                            />
                          ) : user.admin === true ? (
                            <span className="admin-yes">
                              是
                            </span>
                          ) : (
                            <span className="admin-no">
                              否
                            </span>
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={
                                editData.is_active
                              }
                              onChange={(e) =>
                                handleEditChange(
                                  "is_active",
                                  e.target.checked
                                )
                              }
                            />
                          ) : user.is_active ? (
                            <span className="admin-yes">
                              是
                            </span>
                          ) : (
                            <span className="admin-no">
                              否
                            </span>
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <>
                              <button
                                className="admin-save-btn"
                                onClick={() =>
                                  handleSave(user)
                                }
                                disabled={
                                  savingId === user.id
                                }
                              >
                                {savingId === user.id
                                  ? "儲存中..."
                                  : "儲存"}
                              </button>

                              <button
                                className="admin-cancel-btn"
                                onClick={
                                  handleCancelEdit
                                }
                                disabled={
                                  savingId === user.id
                                }
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="admin-detail-btn"
                                onClick={() =>
                                  handleViewDetails(
                                    user
                                  )
                                }
                              >
                                詳細資料
                              </button>

                              {user.admin === true ? (
                                <span className="admin-cannot-delete">
                                  管理員不可編輯、不可刪除
                                </span>
                              ) : (
                                <>
                                  <button
                                    className="admin-edit-btn"
                                    onClick={() =>
                                      handleEdit(user)
                                    }
                                  >
                                    編輯
                                  </button>

                                  <button
                                    className="admin-delete-btn"
                                    onClick={() =>
                                      handleDelete(user)
                                    }
                                    disabled={
                                      deletingId ===
                                      user.id
                                    }
                                  >
                                    {deletingId ===
                                    user.id
                                      ? "刪除中..."
                                      : "刪除"}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* =========================
            其他資料表
        ========================= */}

        <div className="admin-other-tables">

          <h2>其他資料表</h2>

          <div className="admin-table-buttons">
            {ADMIN_TABLES.map((table) => (
              <button
                key={table.key}
                className="admin-table-btn"
                onClick={() =>
                  loadTable(table.key)
                }
              >
                {table.name}
              </button>
            ))}
          </div>

        </div>

        {/* =========================
            資料表內容
        ========================= */}

        {selectedTable && (
          <div className="admin-data-section">

            <h2>
              {
                ADMIN_TABLES.find(
                  (table) =>
                    table.key === selectedTable
                )?.name
              }
            </h2>

            {tableLoading && (
              <p className="admin-loading">
                載入資料中...
              </p>
            )}

            {tableError && (
              <p className="admin-error">
                {tableError}
              </p>
            )}

            {!tableLoading && !tableError && (
              <>
                <p className="admin-count">
                  目前共有 {tableRows.length} 筆資料
                </p>

                {tableRows.length === 0 ? (
                  <p>目前沒有資料</p>
                ) : (
                  <div className="admin-data-table-wrapper">

                    <table className="admin-table">

                      <thead>
                        <tr>
                          {Object.keys(
                            tableRows[0]
                          ).map((column) => (
                            <th key={column}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {tableRows.map(
                          (row, index) => (
                            <tr key={index}>

                              {Object.keys(
                                tableRows[0]
                              ).map((column) => (
                                <td key={column}>

                                  {row[column] ===
                                  null
                                    ? "-"
                                    : typeof row[
                                        column
                                      ] ===
                                      "object"
                                    ? JSON.stringify(
                                        row[column]
                                      )
                                    : String(
                                        row[column]
                                      )}

                                </td>
                              ))}

                            </tr>
                          )
                        )}
                      </tbody>

                    </table>

                  </div>
                )}
              </>
            )}

          </div>
        )}

      </div>

      {/* =========================
          User 詳細資料視窗
      ========================= */}

      {selectedUser && (
        <div
          className="admin-modal-overlay"
          onClick={handleCloseDetails}
        >

          <div
            className="admin-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h2>User 詳細資料</h2>

            <div className="admin-detail-list">

              <p>
                <strong>ID：</strong>
                {selectedUser.id}
              </p>

              <p>
                <strong>Name：</strong>
                {selectedUser.name || "-"}
              </p>

              <p>
                <strong>Nickname：</strong>
                {selectedUser.nickname || "-"}
              </p>

              <p>
                <strong>Description：</strong>
                {selectedUser.description || "-"}
              </p>

              <p>
                <strong>Role：</strong>
                {selectedUser.role || "-"}
              </p>

              <p>
                <strong>Admin：</strong>
                {selectedUser.admin
                  ? "是"
                  : "否"}
              </p>

              <p>
                <strong>Active：</strong>
                {selectedUser.is_active
                  ? "是"
                  : "否"}
              </p>

              <p>
                <strong>Created：</strong>
                {selectedUser.created_at || "-"}
              </p>

              <p>
                <strong>Updated：</strong>
                {selectedUser.updated_at || "-"}
              </p>

              <p>
                <strong>Profile URL：</strong>
                {selectedUser.profile_url || "-"}
              </p>

            </div>

            <button
              className="admin-cancel-btn"
              onClick={handleCloseDetails}
            >
              關閉
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default Admin;