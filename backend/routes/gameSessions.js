import express from "express";
import { supabase } from "../supabaseClient.js";

import {
  GAME_SESSION_SELECT,
} from "../constants/selects.js";

import {
  createUniqueRoomCode,
} from "../utils/roomCode.js";

import {
  getSessionFullData,
} from "../services/sessionService.js";

import {
  getLeaderboard,
} from "../services/leaderboardService.js";

import { getIO } from "../socket.js";

const router = express.Router();

/* =========================
   Create Session
========================= */

router.post("/create", async (req, res) => {
  try {
    const { quiz_id } = req.body;

    if (!quiz_id) {
      return res.status(400).json({
        success: false,
        error: "quiz_id 為必填",
      });
    }

    const roomCode =
      await createUniqueRoomCode();

    const {
      data: session,
      error,
    } = await supabase
      .from("game_sessions")
      .insert([
        {
          quiz_id,
          room_code: roomCode,
          started_at: null,
          ended_at: null,
          current_question: 0,
          game_finished: false,
        },
      ])
      .select(
        GAME_SESSION_SELECT
      )
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      session,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =========================
   Join Session By RoomCode
========================= */

router.get(
  "/join/:roomCode",
  async (req, res) => {
    try {
      const roomCode =
        req.params.roomCode.toUpperCase();

      const {
        data: session,
        error,
      } = await supabase
        .from("game_sessions")
        .select(
          GAME_SESSION_SELECT
        )
        .eq(
          "room_code",
          roomCode
        )
        .is(
          "ended_at",
          null
        )
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          success: false,
          error:
            error.message,
        });
      }

      if (!session) {
        return res.status(404).json({
          success: false,
          error:
            "找不到房間或房間已結束",
        });
      }

      res.json({
        success: true,
        session,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

/* =========================
   Session Detail
========================= */

router.get(
  "/:sessionId",
  async (req, res) => {
    try {
      const data =
        await getSessionFullData(
          Number(
            req.params.sessionId
          )
        );

      res.json({
        success: true,
        ...data,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

/* =========================
   Start Game
========================= */

router.put(
  "/:sessionId/start",
  async (req, res) => {
    try {
      const sessionId =
        Number(
          req.params.sessionId
        );

      const {
        data: session,
        error,
      } = await supabase
        .from("game_sessions")
        .update({
          started_at:
            new Date().toISOString(),
          current_question: 0,
          game_finished: false,
        })
        .eq(
          "session_id",
          sessionId
        )
        .select(
          GAME_SESSION_SELECT
        )
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error:
            error.message,
        });
      }

      const io = getIO();

      io.to(
        `session:${sessionId}`
      ).emit(
        "game-started",
        { session }
      );

      res.json({
        success: true,
        session,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

/* =========================
   Next Question
========================= */

router.put(
  "/:sessionId/next",
  async (req, res) => {
    try {
      const sessionId =
        Number(
          req.params.sessionId
        );

      const {
        current_question,
      } = req.body;

      const nextQuestion =
        Number(
          current_question
        ) + 1;

      const {
        data: session,
        error,
      } = await supabase
        .from("game_sessions")
        .update({
          current_question:
            nextQuestion,
        })
        .eq(
          "session_id",
          sessionId
        )
        .select(
          GAME_SESSION_SELECT
        )
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error:
            error.message,
        });
      }

      const io = getIO();

      io.to(
        `session:${sessionId}`
      ).emit(
        "question-changed",
        { session }
      );

      res.json({
        success: true,
        session,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

/* =========================
   Finish Game
========================= */

router.put(
  "/:sessionId/finish",
  async (req, res) => {
    try {
      const sessionId =
        Number(
          req.params.sessionId
        );

      const {
        data: session,
        error,
      } = await supabase
        .from("game_sessions")
        .update({
          game_finished: true,
          ended_at:
            new Date().toISOString(),
        })
        .eq(
          "session_id",
          sessionId
        )
        .select(
          GAME_SESSION_SELECT
        )
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error:
            error.message,
        });
      }

      const leaderboard =
        await getLeaderboard(
          sessionId
        );

      const io = getIO();

      io.to(
        `session:${sessionId}`
      ).emit(
        "game-finished",
        {
          session,
          leaderboard,
        }
      );

      res.json({
        success: true,
        session,
        leaderboard,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

export default router;