# AR Vision Link Store Assets

商城素材固定分為四類：`hair`、`face`、`top`、`bottoms`。

1. 將透明 PNG 放進對應資料夾。
2. 使用專案根目錄的 `store-outfit-calibrator.html` 組合並校正套裝。
3. 下載產生的 `storeCatalogData.js`，取代 `src/data/storeCatalogData.js`。
4. 重新 build 與 deploy 後，所有使用者會看到同一份商城上架內容。

商城目前只提供完整套裝預覽與直接穿戴，不含付款或購買權限。
