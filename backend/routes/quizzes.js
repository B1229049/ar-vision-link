import express from "express";
import { supabase } from "../supabaseClient.js";

import {
  QUIZ_SELECT,
  QUESTION_SELECT,
} from "../constants/selects.js";

const router = express.Router();

/* =========================
   Create Quiz
========================= */

router.post("/create", async (req, res) => {
  try {
    const {
      host_id,
      title,
      questions,
    } = req.body;

    if (!host_id) {
      return res.status(400).json({
        success: false,
        error: "host_id 為必填",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        error: "title 為必填",
      });
    }

    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "questions 至少需要一題",
      });
    }

    const {
      data: quiz,
      error: quizError,
    } = await supabase
      .from("quizzes")
      .insert([
        {
          host_id,
          title: title.trim(),
        },
      ])
      .select(QUIZ_SELECT)
      .single();

    if (quizError) {
      return res.status(500).json({
        success: false,
        error: quizError.message,
      });
    }

    const questionRows =
      questions.map((q) => ({
        quiz_id: quiz.quiz_id,

        question_text:
          q.question_text?.trim() || "",

        options: {
          A:
            q.option_a?.trim() ||
            "",

          B:
            q.option_b?.trim() ||
            "",

          C:
            q.option_c?.trim() ||
            "",

          D:
            q.option_d?.trim() ||
            "",
        },

        correct_answer:
          q.correct_answer || "A",

        time_limit:
          Number(
            q.time_limit
          ) || 20,
      }));

    const invalidQuestion =
      questionRows.find(
        (q) =>
          !q.question_text ||
          !q.options.A ||
          !q.options.B ||
          !q.options.C ||
          !q.options.D
      );

    if (invalidQuestion) {
      await supabase
        .from("quizzes")
        .delete()
        .eq(
          "quiz_id",
          quiz.quiz_id
        );

      return res.status(400).json({
        success: false,
        error:
          "題目與 A/B/C/D 選項不能空白",
      });
    }

    const {
      data: createdQuestions,
      error: questionsError,
    } = await supabase
      .from("questions")
      .insert(questionRows)
      .select(QUESTION_SELECT);

    if (questionsError) {
      await supabase
        .from("quizzes")
        .delete()
        .eq(
          "quiz_id",
          quiz.quiz_id
        );

      return res.status(500).json({
        success: false,
        error:
          questionsError.message,
      });
    }

    res.json({
      success: true,
      quiz,
      questions:
        createdQuestions || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =========================
   Host Quiz List
========================= */

router.get(
  "/host/:hostId",
  async (req, res) => {
    try {
      const hostId = Number(
        req.params.hostId
      );

      const {
        data,
        error,
      } = await supabase
        .from("quizzes")
        .select("*")
        .eq(
          "host_id",
          hostId
        )
        .order("quiz_id", {
          ascending: false,
        });

      if (error) {
        return res.status(500).json({
          error:
            error.message,
        });
      }

      res.json({
        quizzes:
          data || [],
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  }
);

/* =========================
   Quiz Detail
========================= */

router.get(
  "/:quizId",
  async (req, res) => {
    try {
      const quizId = Number(
        req.params.quizId
      );

      const {
        data: quiz,
        error: quizError,
      } = await supabase
        .from("quizzes")
        .select("*")
        .eq(
          "quiz_id",
          quizId
        )
        .single();

      if (
        quizError ||
        !quiz
      ) {
        return res.status(404).json({
          error:
            "找不到測驗",
        });
      }

      const {
        data: questions,
        error: questionError,
      } = await supabase
        .from("questions")
        .select("*")
        .eq(
          "quiz_id",
          quizId
        )
        .order(
          "question_id",
          {
            ascending: true,
          }
        );

      if (
        questionError
      ) {
        return res.status(500).json({
          error:
            questionError.message,
        });
      }

      res.json({
        quiz,
        questions:
          questions || [],
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  }
);

/* =========================
   Update Quiz
========================= */

router.put(
  "/:quizId",
  async (req, res) => {
    try {
      const quizId = Number(req.params.quizId);
      const { host_id, title, questions } = req.body;

      const { data: quiz } = await supabase
        .from("quizzes")
        .select("quiz_id, host_id")
        .eq("quiz_id", quizId)
        .single();

      if (!quiz) {
        return res.status(404).json({
          error: "找不到測驗",
        });
      }

      if (Number(quiz.host_id) !== Number(host_id)) {
        return res.status(403).json({
          error: "你不能編輯別人的測驗",
        });
      }

      const quizId = Number(
        req.params.quizId
      );

      const {
        title,
        questions,
      } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          error: "title 為必填",
        });
      }

      if (
        !Array.isArray(questions) ||
        questions.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "questions 至少需要一題",
        });
      }

      const {
        data: quiz,
        error: quizError,
      } = await supabase
        .from("quizzes")
        .update({
          title: title.trim(),
        })
        .eq(
          "quiz_id",
          quizId
        )
        .select("*")
        .single();

      if (quizError) {
        return res.status(500).json({
          success: false,
          error:
            quizError.message,
        });
      }

      const {
        error: deleteError,
      } = await supabase
        .from("questions")
        .delete()
        .eq(
          "quiz_id",
          quizId
        );

      if (deleteError) {
        return res.status(500).json({
          success: false,
          error:
            deleteError.message,
        });
      }

      const questionRows =
        questions.map((q) => ({
          quiz_id: quizId,

          question_text:
            q.question_text?.trim() ||
            "",

          options: {
            A:
              q.option_a?.trim() ||
              "",

            B:
              q.option_b?.trim() ||
              "",

            C:
              q.option_c?.trim() ||
              "",

            D:
              q.option_d?.trim() ||
              "",
          },

          correct_answer:
            q.correct_answer || "A",

          time_limit:
            Number(
              q.time_limit
            ) || 20,
        }));

      const invalidQuestion =
        questionRows.find(
          (q) =>
            !q.question_text ||
            !q.options.A ||
            !q.options.B ||
            !q.options.C ||
            !q.options.D
        );

      if (invalidQuestion) {
        return res.status(400).json({
          success: false,
          error:
            "題目與 A/B/C/D 選項不能空白",
        });
      }

      const {
        data: updatedQuestions,
        error: insertError,
      } = await supabase
        .from("questions")
        .insert(questionRows)
        .select("*");

      if (insertError) {
        return res.status(500).json({
          success: false,
          error:
            insertError.message,
        });
      }

      res.json({
        success: true,
        quiz,
        questions:
          updatedQuestions || [],
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
   Delete Quiz
========================= */

router.delete(
  "/:quizId",
  async (req, res) => {
    try {
      const quizId = Number(req.params.quizId);
      const { host_id } = req.body;

      const { data: quiz } = await supabase
        .from("quizzes")
        .select("quiz_id, host_id")
        .eq("quiz_id", quizId)
        .single();

      if (!quiz) {
        return res.status(404).json({
          error: "找不到測驗",
        });
      }

      if (Number(quiz.host_id) !== Number(host_id)) {
        return res.status(403).json({
          error: "你不能刪除別人的測驗",
        });
      }

      const quizId = Number(
        req.params.quizId
      );

      const {
        error:
          deleteQuestionsError,
      } = await supabase
        .from("questions")
        .delete()
        .eq(
          "quiz_id",
          quizId
        );

      if (
        deleteQuestionsError
      ) {
        return res.status(500).json({
          success: false,
          error:
            deleteQuestionsError.message,
        });
      }

      const {
        error: deleteQuizError,
      } = await supabase
        .from("quizzes")
        .delete()
        .eq(
          "quiz_id",
          quizId
        );

      if (
        deleteQuizError
      ) {
        return res.status(500).json({
          success: false,
          error:
            deleteQuizError.message,
        });
      }

      res.json({
        success: true,
        message:
          "Quiz 已刪除",
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