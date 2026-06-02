import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/* =========================
   Player History List
========================= */

router.get(
  "/player/:userId",
  async (req, res) => {
    try {
      const userId = Number(
        req.params.userId
      );

      const {
        data: records,
        error,
      } = await supabase
        .from("player_records")
        .select(`
          record_id,
          session_id,
          user_id,
          score,
          joined_at,
          game_sessions (
            session_id,
            quiz_id,
            room_code,
            started_at,
            ended_at,
            game_finished,
            quizzes (
              quiz_id,
              title,
              host_id
            )
          )
        `)
        .eq("user_id", userId)
        .order("joined_at", {
          ascending: false,
        });

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      const sessions = [];

      for (const record of records || []) {
        const session =
          record.game_sessions;

        if (!session) continue;

        const {
          data: leaderboard,
        } = await supabase
          .from("player_records")
          .select(
            "user_id, score"
          )
          .eq(
            "session_id",
            session.session_id
          )
          .order("score", {
            ascending: false,
          });

        const rank =
          (leaderboard || [])
            .findIndex(
              (item) =>
                Number(
                  item.user_id
                ) === userId
            ) + 1;

        sessions.push({
          record_id:
            record.record_id,

          session_id:
            session.session_id,

          room_code:
            session.room_code,

          quiz_id:
            session.quiz_id,

          quiz_title:
            session.quizzes
              ?.title ||
            "未命名測驗",

          host_id:
            session.quizzes
              ?.host_id,

          score:
            record.score,

          joined_at:
            record.joined_at,

          started_at:
            session.started_at,

          ended_at:
            session.ended_at,

          game_finished:
            session.game_finished,

          rank:
            rank || null,

          player_count:
            leaderboard
              ?.length || 0,
        });
      }

      res.json({
        success: true,
        sessions,
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
   Player Session Detail
========================= */

router.get(
  "/player/:userId/session/:sessionId",
  async (req, res) => {
    try {
      const userId = Number(
        req.params.userId
      );

      const sessionId =
        Number(
          req.params.sessionId
        );

      const {
        data: record,
        error: recordError,
      } = await supabase
        .from("player_records")
        .select(`
          record_id,
          session_id,
          user_id,
          score,
          joined_at,
          game_sessions (
            session_id,
            quiz_id,
            room_code,
            started_at,
            ended_at,
            game_finished,
            quizzes (
              quiz_id,
              title,
              host_id
            )
          )
        `)
        .eq(
          "user_id",
          userId
        )
        .eq(
          "session_id",
          sessionId
        )
        .single();

      if (
        recordError ||
        !record
      ) {
        return res.status(404).json({
          success: false,
          error:
            "找不到此玩家的遊戲紀錄",
        });
      }

      const {
        data: leaderboard,
      } = await supabase
        .from("player_records")
        .select(`
          user_id,
          score,
          users (
            id,
            name,
            nickname,
            avatar_url
          )
        `)
        .eq(
          "session_id",
          sessionId
        )
        .order("score", {
          ascending: false,
        });

      const rank =
        (leaderboard || [])
          .findIndex(
            (item) =>
              Number(
                item.user_id
              ) === userId
          ) + 1;

      const {
        data: answers,
        error: answersError,
      } = await supabase
        .from("player_answers")
        .select(`
          answer_id,
          session_id,
          question_id,
          user_id,
          answer,
          is_correct,
          score,
          answered_at,
          questions (
            question_id,
            question_text,
            correct_answer,
            options
          )
        `)
        .eq(
          "user_id",
          userId
        )
        .eq(
          "session_id",
          sessionId
        )
        .order(
          "question_id",
          {
            ascending: true,
          }
        );

      if (answersError) {
        return res.status(500).json({
          success: false,
          error:
            answersError.message,
        });
      }

      res.json({
        success: true,

        session:
          record.game_sessions,

        quiz:
          record.game_sessions
            ?.quizzes,

        record: {
          record_id:
            record.record_id,

          score:
            record.score,

          joined_at:
            record.joined_at,

          rank:
            rank || null,

          player_count:
            leaderboard
              ?.length || 0,
        },

        answers:
          answers || [],
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
   Host History List
========================= */

router.get(
  "/host/:hostId",
  async (req, res) => {
    try {
      const hostId = Number(
        req.params.hostId
      );

      const {
        data: sessions,
        error,
      } = await supabase
        .from("game_sessions")
        .select(`
          session_id,
          quiz_id,
          room_code,
          started_at,
          ended_at,
          game_finished,
          quizzes (
            quiz_id,
            title,
            host_id
          )
        `)
        .eq(
          "quizzes.host_id",
          hostId
        )
        .order("started_at", {
          ascending: false,
        });

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      const result = [];

      for (const session of sessions || []) {
        if (!session.quizzes)
          continue;

        const {
          count,
          error: countError,
        } = await supabase
          .from(
            "player_records"
          )
          .select(
            "record_id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "session_id",
            session.session_id
          );

        if (countError) {
          return res.status(500).json({
            success: false,
            error:
              countError.message,
          });
        }

        result.push({
          session_id:
            session.session_id,

          quiz_id:
            session.quiz_id,

          quiz_title:
            session.quizzes
              .title ||
            "未命名測驗",

          room_code:
            session.room_code,

          started_at:
            session.started_at,

          ended_at:
            session.ended_at,

          game_finished:
            session.game_finished,

          player_count:
            count || 0,
        });
      }

      res.json({
        success: true,
        sessions: result,
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
   Host Session Detail
========================= */

router.get(
  "/host/:hostId/session/:sessionId",
  async (req, res) => {
    try {
      const hostId = Number(
        req.params.hostId
      );

      const sessionId =
        Number(
          req.params.sessionId
        );

      const {
        data: session,
        error: sessionError,
      } = await supabase
        .from("game_sessions")
        .select(`
          session_id,
          quiz_id,
          room_code,
          started_at,
          ended_at,
          current_question,
          game_finished,
          quizzes (
            quiz_id,
            title,
            host_id
          )
        `)
        .eq(
          "session_id",
          sessionId
        )
        .single();

      if (
        sessionError ||
        !session
      ) {
        return res.status(404).json({
          success: false,
          error:
            "找不到遊戲場次",
        });
      }

      if (
        Number(
          session.quizzes
            ?.host_id
        ) !== hostId
      ) {
        return res.status(403).json({
          success: false,
          error:
            "你不能查看別人的主持紀錄",
        });
      }

      const {
        data: leaderboard,
        error:
          leaderboardError,
      } = await supabase
        .from("player_records")
        .select(`
          record_id,
          session_id,
          user_id,
          score,
          joined_at,
          users (
            id,
            name,
            nickname,
            avatar_url
          )
        `)
        .eq(
          "session_id",
          sessionId
        )
        .order("score", {
          ascending: false,
        });

      if (
        leaderboardError
      ) {
        return res.status(500).json({
          success: false,
          error:
            leaderboardError.message,
        });
      }

      const {
        data: answers,
        error: answersError,
      } = await supabase
        .from("player_answers")
        .select(`
          answer_id,
          session_id,
          question_id,
          user_id,
          answer,
          is_correct,
          score,
          answered_at,
          users (
            id,
            name,
            nickname,
            avatar_url
          ),
          questions (
            question_id,
            question_text,
            correct_answer,
            options
          )
        `)
        .eq(
          "session_id",
          sessionId
        )
        .order(
          "question_id",
          {
            ascending: true,
          }
        );

      if (answersError) {
        return res.status(500).json({
          success: false,
          error:
            answersError.message,
        });
      }

      res.json({
        success: true,

        session,

        quiz:
          session.quizzes,

        leaderboard:
          leaderboard || [],

        answers:
          answers || [],
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