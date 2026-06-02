import express from "express";
import { supabase } from "../supabaseClient.js";

import {
  PLAYER_RECORD_SELECT,
  PLAYER_ANSWER_SELECT,
} from "../constants/selects.js";

import {
  calculateScore,
} from "../utils/score.js";

import {
  getLeaderboard,
} from "../services/leaderboardService.js";

import { getIO } from "../socket.js";

const router = express.Router();

/* =========================
   Player Join Session
========================= */

router.post(
  "/player-records/join",
  async (req, res) => {
    try {
      const {
        session_id,
        user_id,
      } = req.body;

      if (
        !session_id ||
        !user_id
      ) {
        return res.status(400).json({
          success: false,
          error:
            "session_id 和 user_id 為必填",
        });
      }

      const {
        data: existingRecord,
        error: existingError,
      } = await supabase
        .from("player_records")
        .select(
          PLAYER_RECORD_SELECT
        )
        .eq(
          "session_id",
          session_id
        )
        .eq(
          "user_id",
          user_id
        )
        .maybeSingle();

      if (existingError) {
        return res.status(500).json({
          success: false,
          error:
            existingError.message,
        });
      }

      if (existingRecord) {
        return res.json({
          success: true,
          record:
            existingRecord,
          message:
            "玩家已經加入過",
        });
      }

      const {
        data: record,
        error,
      } = await supabase
        .from("player_records")
        .insert([
          {
            session_id,
            user_id,
            score: 0,
          },
        ])
        .select(
          PLAYER_RECORD_SELECT
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

      io.to(`session:${session_id}`).emit(
        "player-joined",
        { record }
      );

      res.json({
        success: true,
        record,
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
   Session Players
========================= */

router.get(
  "/player-records/session/:sessionId",
  async (req, res) => {
    try {
      const { sessionId } =
        req.params;

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
        .order(
          "joined_at",
          {
            ascending: true,
          }
        );

      if (error) {
        return res.status(500).json({
          success: false,
          error:
            error.message,
        });
      }

      res.json({
        success: true,
        players:
          records || [],
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
   Submit Answer
========================= */

router.post(
  "/player-answers/submit",
  async (req, res) => {
    try {
      const {
        session_id,
        question_id,
        user_id,
        answer,
        time_left,
      } = req.body;

      if (
        !session_id ||
        !question_id ||
        !user_id ||
        !answer
      ) {
        return res.status(400).json({
          success: false,
          error:
            "session_id、question_id、user_id、answer 為必填",
        });
      }

      const {
        data: question,
        error: qError,
      } = await supabase
        .from("questions")
        .select(
          "question_id, correct_answer"
        )
        .eq(
          "question_id",
          question_id
        )
        .single();

      if (
        qError ||
        !question
      ) {
        return res.status(500).json({
          success: false,
          error:
            qError?.message ||
            "找不到題目",
        });
      }

      const isCorrect =
        answer ===
        question.correct_answer;

      const finalScore =
        calculateScore(
          isCorrect,
          time_left
        );

      const {
        data: savedAnswer,
        error: answerError,
      } = await supabase
        .from("player_answers")
        .upsert(
          {
            session_id,
            question_id,
            user_id,
            answer,
            is_correct:
              isCorrect,
            score:
              finalScore,
          },
          {
            onConflict:
              "session_id,question_id,user_id",
          }
        )
        .select(
          PLAYER_ANSWER_SELECT
        )
        .single();

      if (answerError) {
        return res.status(500).json({
          success: false,
          error:
            answerError.message,
        });
      }

      const {
        data: allAnswers,
        error:
          allAnswersError,
      } = await supabase
        .from("player_answers")
        .select("score")
        .eq(
          "session_id",
          session_id
        )
        .eq(
          "user_id",
          user_id
        );

      if (
        allAnswersError
      ) {
        return res.status(500).json({
          success: false,
          error:
            allAnswersError.message,
        });
      }

      const totalScore =
        (
          allAnswers || []
        ).reduce(
          (sum, item) =>
            sum +
            (Number(
              item.score
            ) || 0),
          0
        );

      const {
        data: record,
        error:
          recordError,
      } = await supabase
        .from("player_records")
        .update({
          score:
            totalScore,
        })
        .eq(
          "session_id",
          session_id
        )
        .eq(
          "user_id",
          user_id
        )
        .select(
          PLAYER_RECORD_SELECT
        )
        .single();

      if (recordError) {
        return res.status(500).json({
          success: false,
          error:
            recordError.message,
        });
      }

      const leaderboard =
        await getLeaderboard(
          Number(
            session_id
          )
        );

      const io = getIO();

      io.to(`session:${session_id}`).emit(
        "answer-submitted",
        {
          session_id,
          question_id,
          user_id,
          answer: savedAnswer,
          record,
        }
      );

      io.to(`session:${session_id}`).emit(
        "player-result-updated",
        {
          user_id,
          is_correct:
            isCorrect,
          score_earned:
            finalScore,
          total_score:
            totalScore,
        }
      );

      io.to(`session:${session_id}`).emit(
        "leaderboard-updated",
        {
          leaderboard,
        }
      );

      res.json({
        success: true,
        answer:
          savedAnswer,
        record,
        is_correct:
          isCorrect,
        score_earned:
          finalScore,
        total_score:
          totalScore,
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

/* =========================
   Get Question Answers
========================= */

router.get(
  "/player-answers/session/:sessionId/question/:questionId",
  async (req, res) => {
    try {
      const {
        sessionId,
        questionId,
      } = req.params;

      const {
        data,
        error,
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
          )
        `)
        .eq(
          "session_id",
          sessionId
        )
        .eq(
          "question_id",
          questionId
        )
        .order("score", {
          ascending: false,
        });

      if (error) {
        return res.status(500).json({
          success: false,
          error:
            error.message,
        });
      }

      res.json({
        success: true,
        answers:
          data || [],
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
   Update Score
========================= */

router.put(
  "/player-records/:recordId/score",
  async (req, res) => {
    try {
      const { recordId } =
        req.params;

      const { score } =
        req.body;

      const {
        data,
        error,
      } = await supabase
        .from("player_records")
        .update({
          score:
            Number(score) || 0,
        })
        .eq(
          "record_id",
          recordId
        )
        .select(
          PLAYER_RECORD_SELECT
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
          data.session_id
        );

      const io = getIO();

      io.to(
        `session:${data.session_id}`
      ).emit(
        "leaderboard-updated",
        {
          leaderboard,
        }
      );

      res.json({
        success: true,
        record: data,
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

/* =========================
   Leaderboard
========================= */

router.get(
  "/leaderboard/:sessionId",
  async (req, res) => {
    try {
      const leaderboard =
        await getLeaderboard(
          Number(
            req.params
              .sessionId
          )
        );

      res.json({
        success: true,
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