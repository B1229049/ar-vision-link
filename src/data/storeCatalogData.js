// 商城上架資料的唯一來源。
// 由 store-outfit-calibrator.html 依 public/store 素材產生。
export const STORE_CATALOG_SOURCE = [
  {
    "id": "outfit-01",
    "name": "套裝 01",
    "published": true,
    "pieces": {
      "hair": {
        "id": "store-outfit-01-hair",
        "label": "套裝 01・頭部",
        "front": "store/hair/頭髮01.png"
      },
      "face": {
        "id": "store-outfit-01-face",
        "label": "套裝 01・臉部",
        "front": "store/face/表情01.png"
      },
      "top": {
        "id": "store-outfit-01-top",
        "label": "套裝 01・上半身",
        "front": "store/top/上衣01.png"
      },
      "bottoms": {
        "id": "store-outfit-01-bottoms",
        "label": "套裝 01・下半身",
        "front": "store/bottoms/褲裝01.png"
      }
    },
    "settings": {
      "store-outfit-01-top_front": {
        "scale": 0.42,
        "x_pct": -1.3,
        "y_pct": 15.7
      },
      "store-outfit-01-hair_front": {
        "scale": 1,
        "x_pct": 0,
        "y_pct": -17.65
      },
      "store-outfit-01-face_front": {
        "scale": 0.65,
        "x_pct": -1,
        "y_pct": -8.2
      },
      "store-outfit-01-bottoms_front": {
        "scale": 0.45,
        "x_pct": -0.9,
        "y_pct": 28.8
      }
    }
  }
];
