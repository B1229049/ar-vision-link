import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileImage from "../components/ProfileImage";
import { createPersistentProfileImage } from "../utils/profileImage";
import "../styles/EditProfile.css";

function EditProfile() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [description, setDescription] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const imageInputRef = useRef(null);

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
    setProfileUrl(user.profile_url || "");
  }, [navigate]);

  async function handleProfileImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setProcessingImage(true);
    setImageError("");

    try {
      const imageData = await createPersistentProfileImage(file);
      setProfileUrl(imageData);
    } catch (err) {
      setImageError(err.message || "無法處理這張圖片");
    } finally {
      setProcessingImage(false);
      event.target.value = "";
    }
  }

  function restoreProfileImage() {
    setProfileUrl(currentUser?.profile_url || "");
    setImageError("");
  }

  async function handleSave() {
    if (!currentUser) return;

    if (!name.trim()) {
      alert("姓名不能空白");
      return;
    }

    if (processingImage) return;

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
          ...(profileUrl !== (currentUser.profile_url || "")
            ? { profile_url: profileUrl }
            : {}),
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
          修改你的頭像、名稱、暱稱、自我介紹與額外資訊。
        </p>

        <div className="edit-profile-image-section">
          <ProfileImage
            user={{ ...currentUser, profile_url: profileUrl }}
            className="edit-profile-image-preview"
          />

          <div className="edit-profile-image-actions">
            <button
              type="button"
              className="edit-image-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={processingImage || saving}
            >
              {processingImage ? "處理圖片中..." : "選擇新頭像"}
            </button>

            {profileUrl !== (currentUser.profile_url || "") && (
              <button
                type="button"
                className="edit-image-btn muted"
                onClick={restoreProfileImage}
                disabled={processingImage || saving}
              >
                取消更換
              </button>
            )}
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="edit-profile-image-input"
            onChange={handleProfileImageChange}
          />

          <p className="edit-image-hint">
            圖片會自動縮小；更換頭像不會改變 Face ID 登入資料。
          </p>

          {imageError && <p className="edit-image-error">{imageError}</p>}
        </div>

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
          disabled={saving || processingImage}
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
