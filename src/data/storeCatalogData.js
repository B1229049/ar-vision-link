// 商城上架資料的唯一來源。
// 可由專案根目錄的 store-outfit-calibrator.html 產生並下載此檔案。
export const STORE_CATALOG_SOURCE = [
  {
    id: "neon-signal",
    name: "霓虹訊號",
    tagline: "城市限定套裝",
    description: "俐落輪廓搭配醒目髮型，適合 Quiz 舞台與 AR 合照。",
    badge: "NEW",
    accent: "#8b5cf6",
    published: true,
    pieces: {
      hair: {
        id: "store-neon-signal-hair",
        label: "霓虹訊號・頭部",
        front: "avatar-assets/hair/頭髮08-1.png",
        back: "avatar-assets/hair/頭髮08-2.png",
      },
      face: {
        id: "store-neon-signal-face",
        label: "霓虹訊號・臉部",
        front: "avatar-assets/face/表情08.png",
      },
      top: {
        id: "store-neon-signal-top",
        label: "霓虹訊號・上半身",
        front: "avatar-assets/top/上衣09.png",
      },
      bottoms: {
        id: "store-neon-signal-bottoms",
        label: "霓虹訊號・下半身",
        front: "avatar-assets/bottoms/褲裝05.png",
      },
    },
    settings: {
      "store-neon-signal-hair_front": { scale: 0.93, x_pct: 0.75, y_pct: -11.35 },
      "store-neon-signal-hair_back": { scale: 0.78, x_pct: 0, y_pct: -10.9 },
      "store-neon-signal-face_front": { scale: 0.63, x_pct: -2.65, y_pct: -4.55 },
      "store-neon-signal-top_front": { scale: 0.69, x_pct: -0.7, y_pct: 7.55 },
      "store-neon-signal-bottoms_front": { scale: 0.82, x_pct: -0.7, y_pct: 12.9 },
    },
  },
  {
    id: "midnight-agent",
    name: "午夜特勤",
    tagline: "暗夜行動套裝",
    description: "低調但有存在感的完整造型，為答題房間保留神祕感。",
    badge: "PREVIEW",
    accent: "#3b82f6",
    published: true,
    pieces: {
      hair: {
        id: "store-midnight-agent-hair",
        label: "午夜特勤・頭部",
        front: "avatar-assets/hair/頭髮10-1.png",
        back: "avatar-assets/hair/頭髮10-2.png",
      },
      face: {
        id: "store-midnight-agent-face",
        label: "午夜特勤・臉部",
        front: "avatar-assets/face/表情03.png",
      },
      top: {
        id: "store-midnight-agent-top",
        label: "午夜特勤・上半身",
        front: "avatar-assets/top/上衣13.png",
      },
      bottoms: {
        id: "store-midnight-agent-bottoms",
        label: "午夜特勤・下半身",
        front: "avatar-assets/bottoms/褲裝07.png",
      },
    },
    settings: {
      "store-midnight-agent-hair_front": { scale: 1.05, x_pct: 0.3, y_pct: -10.4 },
      "store-midnight-agent-hair_back": { scale: 1.19, x_pct: 1.75, y_pct: -2.15 },
      "store-midnight-agent-face_front": { scale: 0.7, x_pct: -2.65, y_pct: -6.5 },
      "store-midnight-agent-top_front": { scale: 0.55, x_pct: -0.7, y_pct: 13.4 },
      "store-midnight-agent-bottoms_front": { scale: 0.81, x_pct: -0.9, y_pct: 13.4 },
    },
  },
  {
    id: "violet-rush",
    name: "紫電疾行",
    tagline: "競技場限定套裝",
    description: "鮮明又帶速度感的紫色系造型，適合排行榜上的焦點玩家。",
    badge: "LIMITED",
    accent: "#d946ef",
    published: true,
    pieces: {
      hair: {
        id: "store-violet-rush-hair",
        label: "紫電疾行・頭部",
        front: "avatar-assets/hair/頭髮15-1.png",
        back: "avatar-assets/hair/頭髮15-2.png",
      },
      face: {
        id: "store-violet-rush-face",
        label: "紫電疾行・臉部",
        front: "avatar-assets/face/表情10.png",
      },
      top: {
        id: "store-violet-rush-top",
        label: "紫電疾行・上半身",
        front: "avatar-assets/top/上衣15.png",
      },
      bottoms: {
        id: "store-violet-rush-bottoms",
        label: "紫電疾行・下半身",
        front: "avatar-assets/bottoms/褲裝08.png",
      },
    },
    settings: {
      "store-violet-rush-hair_front": { scale: 1, x_pct: 0, y_pct: -2.65 },
      "store-violet-rush-hair_back": { scale: 0.87, x_pct: 0, y_pct: -2.15 },
      "store-violet-rush-face_front": { scale: 0.58, x_pct: -2.65, y_pct: -6.5 },
      "store-violet-rush-top_front": { scale: 0.63, x_pct: -0.7, y_pct: 13.4 },
      "store-violet-rush-bottoms_front": { scale: 0.72, x_pct: -0.45, y_pct: 14.35 },
    },
  },
];
