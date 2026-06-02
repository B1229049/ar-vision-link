import { Server } from "socket.io";

import { supabase } from "./supabaseClient.js";

import {
  GAME_SESSION_SELECT,
} from "./constants/selects.js";

import {
  getSessionFullData,
} from "./services/sessionService.js";

import {
  getLeaderboard,
} from "./services/leaderboardService.js";

let io = null;

export function initSocket(server, clientUrl = "*") {
  io = new Server(server, {
    cors: {
      origin: clientUrl === "*" ? "*" : clientUrl,
      methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
      ],
    },
  });

  io.on("connection", (socket) => {
    console.log(
      "Socket connected:",
      socket.id
    );

    socket.on(
      "join-session",
      async ({
        sessionId,
        userId,
        role,
      }) => {
        try {
          if (!sessionId) return;

          const room =
            `session:${sessionId}`;

          socket.join(room);

          socket.data.sessionId =
            Number(sessionId);

          socket.data.userId =
            userId
              ? Number(userId)
              : null;

          socket.data.role =
            role || "player";

          const fullData =
            await getSessionFullData(
              Number(sessionId)
            );

          const leaderboard =
            await getLeaderboard(
              Number(sessionId)
            );

          socket.emit(
            "session-sync",
            {
              ...fullData,
              leaderboard,
            }
          );

          socket
            .to(room)
            .emit(
              "user-connected",
              {
                socketId:
                  socket.id,
                userId,
                role,
              }
            );
        } catch (err) {
          socket.emit(
            "socket-error",
            {
              error:
                err.message,
            }
          );
        }
      }
    );

    socket.on(
      "start-game",
      async ({
        sessionId,
      }) => {
        try {
          const {
            data: session,
            error,
          } = await supabase
            .from(
              "game_sessions"
            )
            .update({
              started_at:
                new Date().toISOString(),
              current_question: 0,
              game_finished: false,
            })
            .eq(
              "session_id",
              Number(sessionId)
            )
            .select(
              GAME_SESSION_SELECT
            )
            .single();

          if (error)
            throw new Error(
              error.message
            );

          io.to(
            `session:${sessionId}`
          ).emit(
            "game-started",
            { session }
          );
        } catch (err) {
          socket.emit(
            "socket-error",
            {
              error:
                err.message,
            }
          );
        }
      }
    );

    socket.on(
      "next-question",
      async ({
        sessionId,
        currentQuestion,
      }) => {
        try {
          const nextQuestion =
            Number(
              currentQuestion
            ) + 1;

          const {
            data: session,
            error,
          } = await supabase
            .from(
              "game_sessions"
            )
            .update({
              current_question:
                nextQuestion,
            })
            .eq(
              "session_id",
              Number(sessionId)
            )
            .select(
              GAME_SESSION_SELECT
            )
            .single();

          if (error)
            throw new Error(
              error.message
            );

          io.to(
            `session:${sessionId}`
          ).emit(
            "question-changed",
            { session }
          );
        } catch (err) {
          socket.emit(
            "socket-error",
            {
              error:
                err.message,
            }
          );
        }
      }
    );

    socket.on(
      "finish-game",
      async ({
        sessionId,
      }) => {
        try {
          const {
            data: session,
            error,
          } = await supabase
            .from(
              "game_sessions"
            )
            .update({
              game_finished: true,
              ended_at:
                new Date().toISOString(),
            })
            .eq(
              "session_id",
              Number(sessionId)
            )
            .select(
              GAME_SESSION_SELECT
            )
            .single();

          if (error)
            throw new Error(
              error.message
            );

          const leaderboard =
            await getLeaderboard(
              Number(sessionId)
            );

          io.to(
            `session:${sessionId}`
          ).emit(
            "game-finished",
            {
              session,
              leaderboard,
            }
          );
        } catch (err) {
          socket.emit(
            "socket-error",
            {
              error:
                err.message,
            }
          );
        }
      }
    );

    /* =====================
       WebRTC
    ===================== */

    socket.on(
      "webrtc-host-ready",
      ({
        sessionId,
        userId,
      }) => {
        const room =
          `session:${sessionId}`;

        socket.join(room);

        socket.data.sessionId =
          Number(sessionId);

        socket.data.userId =
          userId
            ? Number(userId)
            : null;

        socket.data.role =
          "host";

        socket
          .to(room)
          .emit(
            "webrtc-host-ready",
            {
              hostSocketId:
                socket.id,
              userId,
            }
          );
      }
    );

    socket.on(
      "webrtc-player-ready",
      ({
        sessionId,
        userId,
        user,
      }) => {
        const room =
          `session:${sessionId}`;

        socket.join(room);

        socket.data.sessionId =
          Number(sessionId);

        socket.data.userId =
          userId
            ? Number(userId)
            : null;

        socket.data.role =
          "player";

        socket
          .to(room)
          .emit(
            "webrtc-player-ready",
            {
              playerSocketId:
                socket.id,
              userId,
              user,
            }
          );
      }
    );

    socket.on(
      "webrtc-offer",
      ({
        to,
        fromUserId,
        offer,
      }) => {
        if (!to || !offer)
          return;

        io.to(to).emit(
          "webrtc-offer",
          {
            from: socket.id,
            fromUserId,
            offer,
          }
        );
      }
    );

    socket.on(
      "webrtc-answer",
      ({
        to,
        answer,
      }) => {
        if (!to || !answer)
          return;

        io.to(to).emit(
          "webrtc-answer",
          {
            from: socket.id,
            answer,
          }
        );
      }
    );

    socket.on(
      "webrtc-ice-candidate",
      ({
        to,
        candidate,
      }) => {
        if (!to || !candidate)
          return;

        io.to(to).emit(
          "webrtc-ice-candidate",
          {
            from: socket.id,
            candidate,
          }
        );
      }
    );

    socket.on(
      "disconnect",
      () => {
        const sessionId =
          socket.data
            .sessionId;

        if (sessionId) {
          socket
            .to(
              `session:${sessionId}`
            )
            .emit(
              "webrtc-user-disconnected",
              {
                socketId:
                  socket.id,
                userId:
                  socket.data
                    .userId,
                role:
                  socket.data
                    .role,
              }
            );
        }
      }
    );
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error(
      "Socket.IO 尚未初始化"
    );
  }

  return io;
}