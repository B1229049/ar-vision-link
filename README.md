# AR Vision Link

<div align="center">

# 🎮 AR Vision Link
### Interactive AR Quiz Platform

即時多人互動測驗平台 × AR 即時資訊顯示 × 智慧教室應用

![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Render](https://img.shields.io/badge/Render-Backend-46E3B7)
![Realtime](https://img.shields.io/badge/Realtime-Supported-blue)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

# 📖 專案簡介

AR Vision Link 是一套結合 擴增實境（AR）、WebRTC 即時視訊串流、多人線上測驗系統 與 人臉辨識技術 的互動式學習平台。

玩家可透過手機或電腦參與測驗，系統會於玩家畫面中顯示 AR 分數與作答狀態，而主持人則可透過中控台即時監控所有玩家的測驗進度、作答情況與視訊畫面。

本系統以提升線上學習互動性為目標，融合 Kahoot 類型競賽機制與 AR 技術，打造更具沉浸感的學習體驗。

---

# ✨ 系統特色

## 🎮 即時多人測驗
- 建立與管理測驗
- 多人即時加入房間
- 即時作答同步
- 倒數計時機制
- 自動計分系統
- 即時排行榜更新

## 🥽 AR 即時資訊顯示
- 玩家頭頂顯示即時分數
- 玩家頭頂顯示答題結果
- 玩家頭頂顯示排名資訊
- 玩家頭頂顯示連勝紀錄
- 玩家頭頂顯示特殊成就

## 🎛 主持人控制台
- 控制題目切換
- 查看玩家作答狀況
- 即時監控排行榜
- 查看答題統計
- 控制遊戲開始與結束

## 📊 學習分析
- 題目正確率分析
- 玩家表現分析
- 班級統計資料
- 排名變化趨勢
- 測驗歷史紀錄

---

# 🏗 系統架構

```text
 React Frontend 
  GitHub Pages
      │
      ▼
 Socket.IO Server
Render Web Service
      │
      ▼
Supabase Realtime
      │
 ┌────┴──────────┐─────────────┐
 ▼               ▼             ▼
Supabase     ExpressTURN     WebRTC
Database    TURN Server    Video Stream
```

---

# ⚙️ 技術架構

## Frontend
- React
- React Router
- Socket.IO Client
- WebRTC
- Face API.js
- TensorFlow.js
- CSS3
## Backend
- Node.js
- Express
- Socket.IO
## Database
- Supabase
## Video Streaming
- WebRTC
- ExpressTURN

---

# 🎯 遊戲流程

```text
建立測驗
↓
建立房間
↓
玩家加入
↓
開始遊戲
↓
顯示題目
↓
玩家作答
↓
即時計分
↓
AR 顯示結果
↓
排行榜更新
↓
公布結果
```

---

# 🏆 計分機制

總分 = 基本分數 + 時間加成

```text
基本分數 = 1000
時間加成 = 剩餘秒數 × 10
```

範例：

```text
剩餘時間：15 秒

1000 + (15 × 10)
= 1150 分
```

---

# 🗄 資料庫設計

## users

```sql
id INT8 PRIMARY KEY
name VARCHAR
nickname VARCHAR
description TEXT
extra_info TEXT
is_active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
face_embedding FLOAT8[]
avatar_url TEXT
```

## quizzes

```sql
quiz_id INT8 PRIMARY KEY
host_id INT8 REFERENCES users(id)
title VARCHAR
created_at TIMESTAMPTZ
```

## questions

```sql
question_id INT8 PRIMARY KEY
quiz_id INT8 REFERENCES quizzes(quiz_id)
question_text TEXT
options JSONB
correct_answer VARCHAR
time_limit INT4
created_at TIMESTAMPTZ
```

## game_rooms

```sql
session_id INT8 PRIMARY KEY
quiz_id INT8 REFERENCES quizzes(quiz_id)
room_code VARCHAR
started_at TIMESTAMPTZ
ended_at TIMESTAMPTZ
current_question INT4
game_finished BOOLEAN
```

## player_records

```sql
record_id INT8 PRIMARY KEY
session_id INT8 REFERENCES game_sessions(session_id)
user_id INT8 REFERENCES users(id)
score INT4
correct_count INT4
rank INT4
joined_at TIMESTAMPTZ
```

## player_answers

```sql
answer_id INT8 PRIMARY KEY
session_id INT8 REFERENCES game_sessions(session_id)
question_id INT8 REFERENCES questions(question_id)
user_id INT8 REFERENCES users(id)
answer VARCHAR
is_correct BOOLEAN
score INT4
answered_at TIMESTAMPTZ
```

---

# 📂 專案結構

```text
ar-vision-link/
├── backend/
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── public/
│   ├── chest.png
│   ├── favicon.svg
│   ├── icon.svg
│   ├── tfjs-backend-wasm.wasm
│   ├── tfjs-backend-wasm-simd.wasm
│   └── tfjs-backend-wasm-threaded-simd.wasm
│   
├── src/
│   ├── pages/
│   │   ├── Camera.jsx
│   │   ├── CreateQuiz.jsx
│   │   ├── EditProfile.jsx
│   │   ├── FaceLogin.jsx
│   │   ├── Home.jsx
│   │   ├── HostConsole.jsx
│   │   ├── HostLobby.jsx
│   │   ├── JoinQuiz.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── ManageQuizzes.jsx
│   │   ├── Profile.jsx
│   │   ├── QuizGame.jsx
│   │   ├── QuizHome.jsx
│   │   ├── Register.jsx
│   │   └── ReRwgisterFace.jsx
│   │
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ProtectRoute.jsx
│   │   └── TrackedPlayerVideo.jsx
│   │
│   ├── styles/
│   │   ├── Camera.css
│   │   ├── CreateQuiz.css
│   │   ├── EditProfile.css
│   │   ├── FaceLogin.css
│   │   ├── Home.css
│   │   ├── HostConsole.css
│   │   ├── HostLobby.css
│   │   ├── JoinQuiz.css
│   │   ├── Leaderboard.css
│   │   ├── ManageQuizzes.css
│   │   ├── Profile.css
│   │   ├── QuizGame.css
│   │   ├── QuizHome.css
│   │   ├── Register.css
│   │   ├── ReRwgisterFace.css
│   │   └── TrackedPlayerVideo.css
│   │
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│   
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js
```

---

# 🚀 快速開始

## 可以直接在 Github Pages 用瀏覽器運行

https://b1229049.github.io/ar-vision-link/


# 在本地開啟網頁

## Clone Repository

```bash
git clone https://github.com/B1229049/ar-vision-link.git
```

## 安裝套件

```bash
npm install
```

## 啟動開發環境

```bash
npm run dev
```

## 建置正式版本

```bash
npm run build
```

---

# 🌐 部署方式

## Frontend
- GitHub Pages
- Vercel
- Netlify

## Backend
- Render
- Railway
- Fly.io

## Database
- Supabase PostgreSQL

---

# 🔮 未來發展

## AI 功能
- AI 自動產題
- AI 題目推薦
- AI 學習分析
- AI 個人化學習路徑

## AR 功能
- AR 排名顯示
- AR 成就系統
- AR 小組競賽
- AR 任務模式

## 教學功能
- 班級管理
- 課程管理
- 成績分析
- 學習歷程紀錄

---

# 👨‍💻 開發團隊
```
長庚大學 資訊工程學系 三年級 Ar Vision Link Team
   B1229049 陳泓均
   B1229006 陳語嫻
   B1229021 黃星昊
   B1229031 黃柏叡
```

# 📜 授權聲明

本專案僅供教育、研究與學術展示用途。