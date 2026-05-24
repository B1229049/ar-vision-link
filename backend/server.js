import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_SELECT = `
  id,
  name,
  nickname,
  description,
  extra_info,
  avatar_url,
  is_active,
  created_at,
  updated_at,
  face_embedding
`;

const QUIZ_SELECT = `
  quiz_id,
  host_id,
  title,
  created_at
`;

const QUESTION_SELECT = `
  question_id,
  quiz_id,
  question_text,
  options,
  correct_answer,
  time_limit,
  created_at
`;

const GAME_SESSION_SELECT = `
  session_id,
  quiz_id,
  room_code,
  started_at,
  ended_at,
  current_question,
  game_finished
`;

const PLAYER_RECORD_SELECT = `
  record_id,
  session_id,
  user_id,
  score,
  joined_at
`;

const PLAYER_ANSWER_SELECT = `
  answer_id,
  session_id,
  question_id,
  user_id,
  answer,
  is_correct,
  score,
  answered_at
`;

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

async function createUniqueRoomCode() {
  for (let i = 0; i < 10; i++) {
    const roomCode = generateRoomCode();

    const { data, error } = await supabase
      .from("game_sessions")
      .select("session_id")
      .eq("room_code", roomCode)
      .is("ended_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return roomCode;
  }

  throw new Error("無法產生唯一房號，請重試");
}

app.get("/", (req, res) => {
  res.send("AR Vision Link backend is running");
});

/* =========================
   User API
========================= */

app.get("/api/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(USER_SELECT)
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, users: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/users/register", async (req, res) => {
  try {
    const {
      name,
      nickname,
      description,
      extra_info,
      avatar_url,
      face_embedding,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        error: "name 為必填",
      });
    }

    if (!Array.isArray(face_embedding) || face_embedding.length === 0) {
      return res.status(400).json({
        success: false,
        error: "face_embedding 必須是數字陣列",
      });
    }

    const cleanEmbedding = face_embedding.map(Number);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name: name.trim(),
          nickname: nickname?.trim() || "",
          description: description?.trim() || "",
          extra_info: extra_info?.trim() || "",
          avatar_url: avatar_url || "",
          is_active: true,
          face_embedding: cleanEmbedding,
        },
      ])
      .select(USER_SELECT)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      nickname,
      description,
      extra_info,
      avatar_url,
      is_active,
      face_embedding,
    } = req.body;

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (description !== undefined) updateData.description = description;
    if (extra_info !== undefined) updateData.extra_info = extra_info;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (face_embedding !== undefined) {
      updateData.face_embedding = Array.isArray(face_embedding)
        ? face_embedding.map(Number)
        : face_embedding;
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select(USER_SELECT)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   Quiz API
========================= */

app.post("/api/quizzes/create", async (req, res) => {
  try {
    const { host_id, title, questions } = req.body;

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

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "questions 至少需要一題",
      });
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert([{ host_id, title: title.trim() }])
      .select(QUIZ_SELECT)
      .single();

    if (quizError) {
      return res.status(500).json({
        success: false,
        error: quizError.message,
      });
    }

    const questionRows = questions.map((q) => ({
      quiz_id: quiz.quiz_id,
      question_text: q.question_text?.trim() || "",
      options: {
        A: q.option_a?.trim() || "",
        B: q.option_b?.trim() || "",
        C: q.option_c?.trim() || "",
        D: q.option_d?.trim() || "",
      },
      correct_answer: q.correct_answer || "A",
      time_limit: Number(q.time_limit) || 20,
    }));

    const invalidQuestion = questionRows.find(
      (q) =>
        !q.question_text ||
        !q.options.A ||
        !q.options.B ||
        !q.options.C ||
        !q.options.D
    );

    if (invalidQuestion) {
      await supabase.from("quizzes").delete().eq("quiz_id", quiz.quiz_id);

      return res.status(400).json({
        success: false,
        error: "題目與 A/B/C/D 選項不能空白",
      });
    }

    const { data: createdQuestions, error: questionsError } = await supabase
      .from("questions")
      .insert(questionRows)
      .select(QUESTION_SELECT);

    if (questionsError) {
      await supabase.from("quizzes").delete().eq("quiz_id", quiz.quiz_id);

      return res.status(500).json({
        success: false,
        error: questionsError.message,
      });
    }

    res.json({
      success: true,
      quiz,
      questions: createdQuestions || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/api/quizzes/host/:hostId", async (req, res) => {
  try {
    const { hostId } = req.params;

    const { data, error } = await supabase
      .from("quizzes")
      .select(QUIZ_SELECT)
      .eq("host_id", hostId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      quizzes: data || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/api/quizzes/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params;

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(QUIZ_SELECT)
      .eq("quiz_id", quizId)
      .single();

    if (quizError) {
      return res.status(404).json({
        success: false,
        error: quizError.message,
      });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select(QUESTION_SELECT)
      .eq("quiz_id", quizId)
      .order("question_id", { ascending: true });

    if (questionsError) {
      return res.status(500).json({
        success: false,
        error: questionsError.message,
      });
    }

    res.json({
      success: true,
      quiz,
      questions: questions || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.delete("/api/quizzes/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params;

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("quiz_id", quizId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Quiz deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =========================
   Game Session API
========================= */

app.post("/api/game-sessions/create", async (req, res) => {
  try {
    const { quiz_id } = req.body;

    if (!quiz_id) {
      return res.status(400).json({
        success: false,
        error: "quiz_id 為必填",
      });
    }

    const roomCode = await createUniqueRoomCode();

    const { data: session, error } = await supabase
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
      .select(GAME_SESSION_SELECT)
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

app.get("/api/game-sessions/join/:roomCode", async (req, res) => {
  try {
    const roomCode = req.params.roomCode.toUpperCase();

    const { data: session, error } = await supabase
      .from("game_sessions")
      .select(GAME_SESSION_SELECT)
      .eq("room_code", roomCode)
      .is("ended_at", null)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "找不到房間或房間已結束",
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

app.get("/api/game-sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select(GAME_SESSION_SELECT)
      .eq("session_id", sessionId)
      .single();

    if (sessionError) {
      return res.status(404).json({
        success: false,
        error: sessionError.message,
      });
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(QUIZ_SELECT)
      .eq("quiz_id", session.quiz_id)
      .single();

    if (quizError) {
      return res.status(500).json({
        success: false,
        error: quizError.message,
      });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select(QUESTION_SELECT)
      .eq("quiz_id", session.quiz_id)
      .order("question_id", { ascending: true });

    if (questionsError) {
      return res.status(500).json({
        success: false,
        error: questionsError.message,
      });
    }

    res.json({
      success: true,
      session,
      quiz,
      questions: questions || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =========================
   Player Records API
========================= */

app.post("/api/player-records/join", async (req, res) => {
  try {
    const { session_id, user_id } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: "session_id 和 user_id 為必填",
      });
    }

    const { data: existingRecord, error: existingError } = await supabase
      .from("player_records")
      .select(PLAYER_RECORD_SELECT)
      .eq("session_id", session_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        success: false,
        error: existingError.message,
      });
    }

    if (existingRecord) {
      return res.json({
        success: true,
        record: existingRecord,
        message: "玩家已經加入過",
      });
    }

    const { data: record, error } = await supabase
      .from("player_records")
      .insert([
        {
          session_id,
          user_id,
          score: 0,
        },
      ])
      .select(PLAYER_RECORD_SELECT)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

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
});

app.get("/api/player-records/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: records, error } = await supabase
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
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      players: records || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/api/player-answers/submit", async (req, res) => {
  try {
    const { session_id, question_id, user_id, answer, score } = req.body;

    if (!session_id || !question_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: "session_id、question_id、user_id 為必填",
      });
    }

    const { data: question, error: qError } = await supabase
      .from("questions")
      .select("question_id, correct_answer")
      .eq("question_id", question_id)
      .single();

    if (qError) {
      return res.status(500).json({
        success: false,
        error: qError.message,
      });
    }

    const isCorrect = answer === question.correct_answer;
    const finalScore = isCorrect ? Number(score) || 0 : 0;

    const { data: savedAnswer, error: answerError } = await supabase
      .from("player_answers")
      .upsert(
        {
          session_id,
          question_id,
          user_id,
          answer,
          is_correct: isCorrect,
          score: finalScore,
        },
        {
          onConflict: "session_id,question_id,user_id",
        }
      )
      .select(PLAYER_ANSWER_SELECT)
      .single();

    if (answerError) {
      return res.status(500).json({
        success: false,
        error: answerError.message,
      });
    }

    const { data: allAnswers } = await supabase
      .from("player_answers")
      .select("score")
      .eq("session_id", session_id)
      .eq("user_id", user_id);

    const totalScore = (allAnswers || []).reduce(
      (sum, item) => sum + (Number(item.score) || 0),
      0
    );

    await supabase
      .from("player_records")
      .update({ score: totalScore })
      .eq("session_id", session_id)
      .eq("user_id", user_id);

    res.json({
      success: true,
      answer: savedAnswer,
      total_score: totalScore,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/api/player-answers/session/:sessionId/question/:questionId", async (req, res) => {
  try {
    const { sessionId, questionId } = req.params;

    const { data, error } = await supabase
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
      .eq("session_id", sessionId)
      .eq("question_id", questionId)
      .order("score", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      answers: data || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =========================
   Delete User
========================= */

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(USER_SELECT)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/player-records/:recordId/score", async (req, res) => {
  try {
    const { recordId } = req.params;
    const { score } = req.body;

    const { data, error } = await supabase
      .from("player_records")
      .update({
        score: Number(score) || 0,
      })
      .eq("record_id", recordId)
      .select(PLAYER_RECORD_SELECT)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      record: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/api/leaderboard/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data, error } = await supabase
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
      .eq("session_id", sessionId)
      .order("score", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      leaderboard: data || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.put("/api/game-sessions/:sessionId/start", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from("game_sessions")
      .update({
          started_at: new Date().toISOString(),
          current_question: 0,
          game_finished: false,
        })
      .eq("session_id", sessionId)
      .select(GAME_SESSION_SELECT)
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

app.put("/api/game-sessions/:sessionId/next", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { current_question } = req.body;

    const nextQuestion = Number(current_question) + 1;

    const { data: session, error } = await supabase
      .from("game_sessions")
      .update({
        current_question: nextQuestion,
      })
      .eq("session_id", sessionId)
      .select(GAME_SESSION_SELECT)
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

app.put("/api/game-sessions/:sessionId/finish", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from("game_sessions")
      .update({
        game_finished: true,
        ended_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
      .select(GAME_SESSION_SELECT)
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});