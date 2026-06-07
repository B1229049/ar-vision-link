import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EditProfile.css";

function EditProfile() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [description, setDescription] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const [saving, setSaving] = useState(false);

  const BACKEND_URL = "https://ar-vision-link.onrender.com";

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (!savedUser) {
      navigate("/face-login");
      return;
    }

    const user = JSON.parse(savedUser);

    setCurrentUser(user);
    setName(user.name || "");
    setNickname(user.nickname || "");
    setDescription(user.description || "");
    setExtraInfo(user.extra_info || "");
  }, [navigate]);

  async function handleSave() {
    if (!currentUser) return;

    if (!name.trim()) {
      alert("姓名不能空白");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          nickname: nickname.trim(),
          description: description.trim(),
          extra_info: extraInfo.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("更新失敗：" + (result.error || "未知錯誤"));
        setSaving(false);
        return;
      }

      const updatedUser = {
        ...currentUser,
        ...result.user,
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      alert("個人資料更新成功！");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      alert("更新過程發生錯誤");
    }

    setSaving(false);
  }

  if (!currentUser) {
    return (
      <div className="edit-profile-page">
        <div className="edit-profile-card">
          <p>載入資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        <h2>編輯個人資料</h2>

        <p className="edit-subtitle">
          修改你的名稱、暱稱、自我介紹與額外資訊。
        </p>

        <div className="edit-field">
          <label>姓名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="請輸入姓名"
          />
        </div>

        <div className="edit-field">
          <label>暱稱</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="請輸入暱稱"
          />
        </div>

        <div className="edit-field">
          <label>自我介紹</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="簡短介紹自己"
          />
        </div>

        <div className="edit-field">
          <label>額外資訊</label>
          <textarea
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            placeholder="例如：IG / 備註 / 興趣"
          />
        </div>

        <button
          className="edit-btn primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "儲存中..." : "儲存修改"}
        </button>

        <button
          className="edit-btn secondary"
          onClick={() => navigate("/profile")}
        >
          取消
        </button>
      </div>
    </div>
  );
}

export default EditProfile;