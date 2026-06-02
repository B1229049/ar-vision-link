import express from "express";
import cors from "cors";
import http from "http";

import { initSocket } from "./socket.js";

/* routes */
import usersRoutes from "./routes/users.js";
import faceRoutes from "./routes/face.js";
import quizzesRoutes from "./routes/quizzes.js";
import aiRoutes from "./routes/ai.js";
import gameSessionsRoutes from "./routes/gameSessions.js";
import playerRoutes from "./routes/player.js";
import historyRoutes from "./routes/history.js";
import iceRoutes from "./routes/ice.js";

const app = express();

const server =
  http.createServer(app);

const CLIENT_URL =
  process.env.CLIENT_URL ||
  "*";

app.use(
  cors({
    origin:
      CLIENT_URL === "*"
        ? "*"
        : CLIENT_URL,
  })
);

app.use(
  express.json({
    limit: "10mb",
  })
);

initSocket(
  server,
  CLIENT_URL
);

app.get("/", (req, res) => {
  res.send(
    "AR Vision Link backend is running"
  );
});

app.use(
  "/api/users",
  usersRoutes
);

app.use(
  "/api",
  faceRoutes
);

app.use(
  "/api/quizzes",
  quizzesRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

app.use(
  "/api/game-sessions",
  gameSessionsRoutes
);

app.use(
  "/api",
  playerRoutes
);

app.use(
  "/api/history",
  historyRoutes
);

app.use(
  "/api/ice-config",
  iceRoutes
);

const PORT =
  process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});