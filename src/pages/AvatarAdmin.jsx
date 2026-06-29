import { useEffect, useMemo, useState } from "react";
import AvatarRenderer from "../components/AvatarRenderer";
import {
  AVATAR_CATEGORIES,
  AVATAR_ITEMS,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_AVATAR_ITEM_SETTINGS,
  getAvatarItem,
  getItemSetting,
} from "../utils/avatarConfig";
import "../styles/AvatarAdmin.css";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://ar-vision-link.onrender.com";
const LOCAL_SETTINGS_KEY = "avatar_item_settings_draft";

function AvatarAdmin() {
  const [adminKey, setAdminKey] = useState("");
  const [itemSettings, setItemSettings] = useState(DEFAULT_AVATAR_ITEM_SETTINGS);
  const [category, setCategory] = useState("hair");
  const [itemId, setItemId] = useState(AVATAR_ITEMS.hair[0]?.id || "");
  const [layer, setLayer] = useState("front");
  const [form, setForm] = useState({
    scale: 1,
    x: 0,
    y: 0,
    thumb_scale: 1,
    thumb_x: 0,
    thumb_y: 0,
  });
  const [saving, setSaving] = useState(false);

  const selectedItem = useMemo(
    () => getAvatarItem(category, itemId),
    [category, itemId]
  );

  useEffect(() => {
    loadItemSettings();
  }, []);

  useEffect(() => {
    const firstItem = AVATAR_ITEMS[category]?.[0];
    setItemId(firstItem?.id || "");
    setLayer("front");
  }, [category]);

  useEffect(() => {
    setForm(getItemSetting(itemSettings, itemId, layer));
  }, [itemSettings, itemId, layer]);

  async function loadItemSettings() {
    let localSettings = {};

    try {
      localSettings = JSON.parse(
        localStorage.getItem(LOCAL_SETTINGS_KEY) || "{}"
      );
    } catch {
      localSettings = {};
    }

    setItemSettings({
      ...DEFAULT_AVATAR_ITEM_SETTINGS,
      ...localSettings,
    });

    try {
      const response = await fetch(`${BACKEND_URL}/api/avatar/item-settings`);
      const result = await response.json();

      if (response.ok && result.success) {
        setItemSettings({
          ...DEFAULT_AVATAR_ITEM_SETTINGS,
          ...(result.settings || {}),
          ...localSettings,
        });
      }
    } catch (err) {
      console.error("載入素材設定失敗：", err);
    }
  }

  function updateForm(field, value) {
    const numericValue = Number(value);
    setForm((prev) => ({
      ...prev,
      [field]: Number.isFinite(numericValue) ? numericValue : 0,
    }));
  }

  function saveLocalSetting() {
    const nextSettings = {
      ...itemSettings,
      [`${itemId}_${layer}`]: form,
    };

    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(nextSettings));
    setItemSettings(nextSettings);
    alert("已儲存到本機預覽。確認後請複製下方設定碼到 avatarItemSettings.js。");
  }

  async function saveBackendSetting() {
    if (!adminKey.trim()) {
      alert("如果要存到後端，才需要輸入 AVATAR_ADMIN_KEY。Render 無法設定時可略過這個按鈕。");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/avatar/item-settings/${itemId}/${layer}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-avatar-admin-key": adminKey.trim(),
          },
          body: JSON.stringify(form),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert("儲存失敗：" + (result.error || "未知錯誤"));
        return;
      }

      const nextSettings = {
        ...DEFAULT_AVATAR_ITEM_SETTINGS,
        ...(result.settings || {}),
      };

      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(nextSettings));
      setItemSettings(nextSettings);
      alert("素材設定已儲存到後端，所有使用者會套用新的顯示設定");
    } catch (err) {
      console.error(err);
      alert("儲存素材設定時發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  const previewSettings = {
    ...itemSettings,
    [`${itemId}_${layer}`]: form,
  };

  const previewConfig = {
    ...DEFAULT_AVATAR_CONFIG,
    [category]: itemId,
  };

  const exportedSettings = `// Global avatar item placement settings.
// Use /avatar-admin to tune items, then paste the exported object here.
// These settings are bundled into the frontend, so every user sees the same
// corrected item placement after the site is redeployed.
export const DEFAULT_AVATAR_ITEM_SETTINGS = ${JSON.stringify(
    previewSettings,
    null,
    2
  )};
`;

  return (
    <div className="avatar-admin-page">
      <div className="avatar-admin-card">
        <div className="avatar-admin-preview">
          <div className="avatar-admin-stage">
            <AvatarRenderer
              config={previewConfig}
              itemSettings={previewSettings}
              className="avatar-admin-renderer"
            />
          </div>

          <div className="avatar-admin-panel">
            <h2>Avatar 素材設定</h2>
            <p>
              這裡是開發者用的全域設定。儲存後，所有穿到該素材的使用者都會套用。
            </p>

            <label>開發者管理 key</label>
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="可選：只有存後端才需要"
              type="password"
            />

            <label>部位</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {AVATAR_CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>

            <label>素材</label>
            <select
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setLayer("front");
              }}
            >
              {(AVATAR_ITEMS[category] || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            {selectedItem?.backImg && (
              <>
                <label>圖層</label>
                <select value={layer} onChange={(e) => setLayer(e.target.value)}>
                  <option value="front">上層</option>
                  <option value="back">下層</option>
                </select>
              </>
            )}

            <div className="avatar-admin-grid">
              <RangeInput label="角色縮放" field="scale" value={form.scale} min="0.1" max="3" step="0.01" onChange={updateForm} />
              <RangeInput label="角色 X" field="x" value={form.x} min="-200" max="200" step="1" onChange={updateForm} />
              <RangeInput label="角色 Y" field="y" value={form.y} min="-200" max="200" step="1" onChange={updateForm} />
              <RangeInput label="縮圖縮放" field="thumb_scale" value={form.thumb_scale} min="0.5" max="2.5" step="0.01" onChange={updateForm} />
              <RangeInput label="縮圖 X" field="thumb_x" value={form.thumb_x} min="-100" max="100" step="1" onChange={updateForm} />
              <RangeInput label="縮圖 Y" field="thumb_y" value={form.thumb_y} min="-100" max="100" step="1" onChange={updateForm} />
            </div>

            <button
              className="avatar-admin-btn"
              onClick={saveLocalSetting}
            >
              儲存本機預覽
            </button>

            <button
              className="avatar-admin-btn secondary"
              onClick={saveBackendSetting}
              disabled={saving}
            >
              {saving ? "儲存中..." : "儲存到後端"}
            </button>

            <label>匯出設定碼</label>
            <textarea
              className="avatar-admin-export"
              value={exportedSettings}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <p className="avatar-admin-hint">
              Render 無法設定時，用「儲存本機預覽」調整到滿意，複製這段內容覆蓋
              src/utils/avatarItemSettings.js，重新部署前端後所有 user 都會同步。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RangeInput({ label, field, value, min, max, step, onChange }) {
  return (
    <div className="avatar-admin-range">
      <label>
        {label}: <span>{Number(value || 0).toFixed(step === "1" ? 0 : 2)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
      />
    </div>
  );
}

export default AvatarAdmin;
