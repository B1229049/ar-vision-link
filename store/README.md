# AR Vision Link Store Assets

商城素材分為 `hair`、`face`、`top`、`bottoms`，校正用模板放在 `templates`。

1. 素材從 `01` 開始，同一個編號的四個部位會自動組成一套完整套裝。
2. 頭部可使用單張 `頭髮01.png`，或前後層 `頭髮01-1.png`、`頭髮01-2.png`。
3. 臉部、上半身、下半身分別使用 `表情01.png`、`上衣01.png`、`褲裝01.png`；也支援直接命名為 `01.png`。
4. 將 `模板00.png`、`模板02.png` 放進 `store/templates`。
5. 使用專案根目錄的 `store-outfit-calibrator.html` 自動讀取並校正套裝。
6. 下載產生的 `storeCatalogData.js`，取代 `src/data/storeCatalogData.js`。
7. 重新 build 與 deploy 後，所有使用者會看到同一份商城上架內容。

商城目前只提供完整套裝預覽與直接穿戴，不含付款或購買權限。
