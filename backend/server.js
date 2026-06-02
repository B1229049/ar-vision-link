import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "*";

app.use(
  cors({
    origin: CLIENT_URL === "*" ? "*" : CLIENT_URL,
  })
);

app.use(express.json({ limit: "10mb" }));

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL === "*" ? "*" : CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const USER_PUBLIC_SELECT = `
  id,
  name,
  nickname,
  description,
  extra_info,
  avatar_url,
  is_active,
  created_at,
  updated_at
`;

const USER_PRIVATE_SELECT = `
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

async function getSessionFullData(sessionId) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select(GAME_SESSION_SELECT)
    .eq("session_id", sessionId)
    .single();

  if (sessionError) throw new Error(sessionError.message);

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(QUIZ_SELECT)
    .eq("quiz_id", session.quiz_id)
    .single();

  if (quizError) throw new Error(quizError.message);

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select(QUESTION_SELECT)
    .eq("quiz_id", session.quiz_id)
    .order("question_id", { ascending: true });

  if (questionsError) throw new Error(questionsError.message);

  return {
    session,
    quiz,
    questions: questions || [],
  };
}

async function getLeaderboard(sessionId) {
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

  if (error) throw new Error(error.message);

  return data || [];
}

function calculateScore(isCorrect, timeLeft = 0) {
  if (!isCorrect) return 0;

  const baseScore = 1000;
  const bonus = Math.max(Number(timeLeft) || 0, 0) * 10;

  return baseScore + bonus;
}

let userEmbeddingCache = null;
let userEmbeddingCacheTime = 0;

const USER_EMBEDDING_CACHE_TTL = 30 * 1000;

async function getActiveUsersWithEmbeddings() {
  const now = Date.now();

  if (
    userEmbeddingCache &&
    now - userEmbeddingCacheTime < USER_EMBEDDING_CACHE_TTL
  ) {
    return userEmbeddingCache;
  }

  const { data, error } = await supabase
    .from("users")
    .select(USER_PRIVATE_SELECT)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  userEmbeddingCache = data || [];
  userEmbeddingCacheTime = now;

  return userEmbeddingCache;
}

function clearUserEmbeddingCache() {
  userEmbeddingCache = null;
  userEmbeddingCacheTime = 0;
}

function cleanQuestion(q) {
  return {
    question_text: String(q.question_text || "").trim(),
    option_a: String(q.option_a || "").trim(),
    option_b: String(q.option_b || "").trim(),
    option_c: String(q.option_c || "").trim(),
    option_d: String(q.option_d || "").trim(),
    correct_answer: ["A", "B", "C", "D"].includes(q.correct_answer)
      ? q.correct_answer
      : "A",
    time_limit: Number(q.time_limit) || 20,
  };
}

function validateQuestions(questions, expectedCount = 5) {
  if (!Array.isArray(questions)) {
    throw new Error("AI 回傳不是題目陣列");
  }

  const cleaned = questions.map(cleanQuestion);

  const validQuestions = cleaned.filter((q) => {
    if (!q.question_text) return false;
    if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) return false;

    const options = [q.option_a, q.option_b, q.option_c, q.option_d];
    const uniqueOptions = new Set(options);

    if (uniqueOptions.size < 4) return false;

    if (!["A", "B", "C", "D"].includes(q.correct_answer)) return false;

    return true;
  });

  if (validQuestions.length === 0) {
    throw new Error("AI 產生的題目全部不合格，請重新產生");
  }

  return validQuestions.slice(0, Number(expectedCount) || 5);
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
      .select(USER_PUBLIC_SELECT)
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
      .select(USER_PUBLIC_SELECT)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    
    clearUserEmbeddingCache();

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

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select(USER_PUBLIC_SELECT)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
      .select(USER_PUBLIC_SELECT)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    clearUserEmbeddingCache();

    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/face-login", async (req, res) => {
  try {
    const { descriptor } = req.body;

    if (!Array.isArray(descriptor)) {
      return res.status(400).json({
        success: false,
        error: "descriptor 必須是陣列",
      });
    }

    const users = await getActiveUsersWithEmbeddings();

    let bestUser = null;
    let bestDistance = Infinity;

    for (const user of users || []) {
      if (
        !Array.isArray(user.face_embedding) ||
        user.face_embedding.length !== descriptor.length
      ) {
        continue;
      }

      let sum = 0;

      for (let i = 0; i < descriptor.length; i++) {
        const diff =
          Number(descriptor[i]) -
          Number(user.face_embedding[i]);

        sum += diff * diff;
      }

      const distance = Math.sqrt(sum);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestUser = user;
      }
    }

    if (!bestUser || bestDistance > 0.5) {
      return res.json({
        success: false,
        error: "找不到符合的人臉",
      });
    }

    delete bestUser.face_embedding;

    res.json({
      success: true,
      distance: bestDistance,
      user: bestUser,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.put("/api/users/:id/face", async (req, res) => {
  try {
    const { id } = req.params;
    const { face_embedding, avatar_url } = req.body;

    if (!Array.isArray(face_embedding)) {
      return res.status(400).json({
        success: false,
        error: "face_embedding 必須是陣列",
      });
    }

    const { data, error } = await supabase
      .from("users")
      .update({
        face_embedding: face_embedding.map(Number),
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(USER_PUBLIC_SELECT)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    clearUserEmbeddingCache();

    res.json({
      success: true,
      user: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/api/face-recognize-batch", async (req, res) => {
  try {
    const { descriptors } = req.body;

    if (!Array.isArray(descriptors)) {
      return res.status(400).json({
        success: false,
        error: "descriptors 必須是陣列",
      });
    }

    const users = await getActiveUsersWithEmbeddings();

    const results = [];

    for (const descriptor of descriptors) {
      let bestUser = null;
      let bestDistance = Infinity;

      for (const user of users || []) {
        if (
          !Array.isArray(user.face_embedding) ||
          user.face_embedding.length !== descriptor.length
        ) {
          continue;
        }

        let sum = 0;

        for (let i = 0; i < descriptor.length; i++) {
          const diff =
            Number(descriptor[i]) -
            Number(user.face_embedding[i]);

          sum += diff * diff;
        }

        const distance = Math.sqrt(sum);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestUser = user;
        }
      }

      if (bestUser && bestDistance < 0.45) {
        const safeUser = { ...bestUser };
        delete safeUser.face_embedding;

        results.push({
          user: safeUser,
          distance: bestDistance,
        });
      } else {
        results.push(null);
      }
    }

    res.json({
      success: true,
      results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
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
    const hostId = Number(req.params.hostId);

    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("host_id", hostId)
      .order("quiz_id", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ quizzes: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/quizzes/:quizId", async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("quiz_id", quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: "找不到測驗" });
    }

    const { data: questions, error: questionError } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("question_id", { ascending: true });

    if (questionError) {
      return res.status(500).json({ error: questionError.message });
    }

    res.json({ quiz, questions: questions || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/quizzes/:quizId", async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);
    const { host_id, title, questions } = req.body;

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("quiz_id, host_id")
      .eq("quiz_id", quizId)
      .single();

    if (!quiz) return res.status(404).json({ error: "找不到測驗" });

    if (Number(quiz.host_id) !== Number(host_id)) {
      return res.status(403).json({ error: "你不能編輯別人的測驗" });
    }

    await supabase.from("quizzes").update({ title }).eq("quiz_id", quizId);

    await supabase.from("questions").delete().eq("quiz_id", quizId);

    const newQuestions = questions.map((q) => ({
      quiz_id: quizId,
      question_text: q.question_text,
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
      },
      correct_answer: q.correct_answer,
      time_limit: q.time_limit,
    }));

    const { error } = await supabase.from("questions").insert(newQuestions);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/quizzes/:quizId", async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);
    const { host_id } = req.body;

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("quiz_id, host_id")
      .eq("quiz_id", quizId)
      .single();

    if (!quiz) return res.status(404).json({ error: "找不到測驗" });

    if (Number(quiz.host_id) !== Number(host_id)) {
      return res.status(403).json({ error: "你不能刪除別人的測驗" });
    }

    await supabase.from("questions").delete().eq("quiz_id", quizId);

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("quiz_id", quizId);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/generate-quiz", async (req, res) => {
  try {
    const { text, question_count = 5, difficulty = "normal" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "請提供教材文字",
      });
    }

    const difficultyText =
      difficulty === "easy"
        ? "簡單：題目應偏向基本理解、定義、直接從教材找得到答案"
        : difficulty === "hard"
        ? "困難：題目應偏向推論、比較、應用與觀念整合"
        : "普通：題目應包含基本理解與少量應用題";

    const prompt = `
你是一位測驗題目設計老師。
請根據以下教材內容，產生 ${question_count} 題四選一選擇題。

難度：${difficultyText}

規則：
1. 只能根據教材內容出題
2. 每題一定要有 A/B/C/D 四個選項
3. correct_answer 只能是 A、B、C、D
4. time_limit 固定給 20
5. 請只回傳 JSON，不要 markdown，不要解釋

回傳格式：
[
  {
    "question_text": "題目",
    "option_a": "選項A",
    "option_b": "選項B",
    "option_c": "選項C",
    "option_d": "選項D",
    "correct_answer": "A",
    "time_limit": 20
  }
]

教材內容：
${text}
`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text;

    let questions;

    try {
      questions = JSON.parse(rawText);
    } catch (err) {
      console.error("Gemini 回傳內容不是合法 JSON：", rawText);
      return res.status(500).json({
        success: false,
        error: "AI 回傳格式錯誤，請重試",
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(500).json({
        success: false,
        error: "AI 回傳不是題目陣列",
      });
    }

    const cleanQuestions = validateQuestions(
      questions,
      question_count
    );

    res.json({
      success: true,
      questions: cleanQuestions,
    });
  } catch (err) {
    console.error("Gemini generate quiz error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/api/ai/generate-quiz-pdf",
  upload.single("file"),
  async (req, res) => {
    try {
      const { question_count = 5, difficulty = "normal" } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "請上傳 PDF 檔案",
        });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          error: "只支援 PDF 檔案",
        });
      }

      const pdfBase64 = req.file.buffer.toString("base64");

      const prompt = `
你是一位測驗題目設計老師。
請根據上傳的 PDF 內容，產生 ${question_count} 題四選一選擇題。

難度：${difficulty}

規則：
1. 只能根據 PDF 內容出題
2. 每題一定要有 A/B/C/D 四個選項
3. correct_answer 只能是 A、B、C、D
4. time_limit 固定給 20
5. 請只回傳 JSON，不要 markdown，不要解釋

回傳格式：
[
  {
    "question_text": "題目",
    "option_a": "選項A",
    "option_b": "選項B",
    "option_c": "選項C",
    "option_d": "選項D",
    "correct_answer": "A",
    "time_limit": 20
  }
]
`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      let questions;

      try {
        questions = JSON.parse(response.text);
      } catch (err) {
        console.error("Gemini 回傳不是 JSON：", response.text);
        return res.status(500).json({
          success: false,
          error: "AI 回傳格式錯誤",
        });
      }

      const cleanQuestions = questions.map((q) => ({
        question_text: q.question_text || "",
        option_a: q.option_a || "",
        option_b: q.option_b || "",
        option_c: q.option_c || "",
        option_d: q.option_d || "",
        correct_answer: ["A", "B", "C", "D"].includes(q.correct_answer)
          ? q.correct_answer
          : "A",
        time_limit: Number(q.time_limit) || 20,
      }));

      res.json({
        success: true,
        questions: cleanQuestions,
      });
    } catch (err) {
      console.error("PDF AI 出題失敗：", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

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

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "找不到房間或房間已結束",
      });
    }

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/game-sessions/:sessionId", async (req, res) => {
  try {
    const data = await getSessionFullData(Number(req.params.sessionId));
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/game-sessions/:sessionId/start", async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

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
      return res.status(500).json({ success: false, error: error.message });
    }

    io.to(`session:${sessionId}`).emit("game-started", { session });

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/game-sessions/:sessionId/next", async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
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
      return res.status(500).json({ success: false, error: error.message });
    }

    io.to(`session:${sessionId}`).emit("question-changed", { session });

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/game-sessions/:sessionId/finish", async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

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
      return res.status(500).json({ success: false, error: error.message });
    }

    const leaderboard = await getLeaderboard(sessionId);

    io.to(`session:${sessionId}`).emit("game-finished", {
      session,
      leaderboard,
    });

    res.json({ success: true, session, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   Player API
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
      return res.status(500).json({ success: false, error: error.message });
    }

    io.to(`session:${session_id}`).emit("player-joined", { record });

    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, players: records || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/player-answers/submit", async (req, res) => {
  try {
    const { session_id, question_id, user_id, answer, time_left } = req.body;

    if (!session_id || !question_id || !user_id || !answer) {
      return res.status(400).json({
        success: false,
        error: "session_id、question_id、user_id、answer 為必填",
      });
    }

    const { data: question, error: qError } = await supabase
      .from("questions")
      .select("question_id, correct_answer")
      .eq("question_id", question_id)
      .single();

    if (qError || !question) {
      return res.status(500).json({
        success: false,
        error: qError?.message || "找不到題目",
      });
    }

    const isCorrect = answer === question.correct_answer;
    const finalScore = calculateScore(isCorrect, time_left);

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

    const { data: allAnswers, error: allAnswersError } = await supabase
      .from("player_answers")
      .select("score")
      .eq("session_id", session_id)
      .eq("user_id", user_id);

    if (allAnswersError) {
      return res.status(500).json({
        success: false,
        error: allAnswersError.message,
      });
    }

    const totalScore = (allAnswers || []).reduce(
      (sum, item) => sum + (Number(item.score) || 0),
      0
    );

    const { data: record, error: recordError } = await supabase
      .from("player_records")
      .update({ score: totalScore })
      .eq("session_id", session_id)
      .eq("user_id", user_id)
      .select(PLAYER_RECORD_SELECT)
      .single();

    if (recordError) {
      return res.status(500).json({
        success: false,
        error: recordError.message,
      });
    }

    const leaderboard = await getLeaderboard(Number(session_id));

    io.to(`session:${session_id}`).emit("answer-submitted", {
      session_id,
      question_id,
      user_id,
      answer: savedAnswer,
      record,
    });

    io.to(`session:${session_id}`).emit("player-result-updated", {
      user_id,
      is_correct: isCorrect,
      score_earned: finalScore,
      total_score: totalScore,
    });

    io.to(`session:${session_id}`).emit("leaderboard-updated", {
      leaderboard,
    });

    res.json({
      success: true,
      answer: savedAnswer,
      record,
      is_correct: isCorrect,
      score_earned: finalScore,
      total_score: totalScore,
      leaderboard,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, answers: data || [] });
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

    const leaderboard = await getLeaderboard(data.session_id);

    io.to(`session:${data.session_id}`).emit("leaderboard-updated", {
      leaderboard,
    });

    res.json({ success: true, record: data, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/leaderboard/:sessionId", async (req, res) => {
  try {
    const leaderboard = await getLeaderboard(Number(req.params.sessionId));

    res.json({
      success: true,
      leaderboard,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/history/player/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const { data: records, error } = await supabase
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
      .order("joined_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    const sessions = [];

    for (const record of records || []) {
      const session = record.game_sessions;

      if (!session) continue;

      const { data: leaderboard } = await supabase
        .from("player_records")
        .select("user_id, score")
        .eq("session_id", session.session_id)
        .order("score", { ascending: false });

      const rank =
        (leaderboard || []).findIndex(
          (item) => Number(item.user_id) === userId
        ) + 1;

      sessions.push({
        record_id: record.record_id,
        session_id: session.session_id,
        room_code: session.room_code,
        quiz_id: session.quiz_id,
        quiz_title: session.quizzes?.title || "未命名測驗",
        host_id: session.quizzes?.host_id,
        score: record.score,
        joined_at: record.joined_at,
        started_at: session.started_at,
        ended_at: session.ended_at,
        game_finished: session.game_finished,
        rank: rank || null,
        player_count: leaderboard?.length || 0,
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
});

app.get("/api/history/player/:userId/session/:sessionId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const sessionId = Number(req.params.sessionId);

    const { data: record, error: recordError } = await supabase
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
      .eq("session_id", sessionId)
      .single();

    if (recordError || !record) {
      return res.status(404).json({
        success: false,
        error: "找不到此玩家的遊戲紀錄",
      });
    }

    const { data: leaderboard } = await supabase
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
      .eq("session_id", sessionId)
      .order("score", { ascending: false });

    const rank =
      (leaderboard || []).findIndex(
        (item) => Number(item.user_id) === userId
      ) + 1;

    const { data: answers, error: answersError } = await supabase
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
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("question_id", { ascending: true });

    if (answersError) {
      return res.status(500).json({
        success: false,
        error: answersError.message,
      });
    }

    res.json({
      success: true,
      session: record.game_sessions,
      quiz: record.game_sessions?.quizzes,
      record: {
        record_id: record.record_id,
        score: record.score,
        joined_at: record.joined_at,
        rank: rank || null,
        player_count: leaderboard?.length || 0,
      },
      answers: answers || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/api/history/host/:hostId", async (req, res) => {
  try {
    const hostId = Number(req.params.hostId);

    const { data: sessions, error } = await supabase
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
      .eq("quizzes.host_id", hostId)
      .order("started_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    const result = [];

    for (const session of sessions || []) {
      if (!session.quizzes) continue;

      const { count, error: countError } = await supabase
        .from("player_records")
        .select("record_id", {
          count: "exact",
          head: true,
        })
        .eq("session_id", session.session_id);

      if (countError) {
        return res.status(500).json({
          success: false,
          error: countError.message,
        });
      }

      result.push({
        session_id: session.session_id,
        quiz_id: session.quiz_id,
        quiz_title: session.quizzes.title || "未命名測驗",
        room_code: session.room_code,
        started_at: session.started_at,
        ended_at: session.ended_at,
        game_finished: session.game_finished,
        player_count: count || 0,
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
});

app.get("/api/history/host/:hostId/session/:sessionId", async (req, res) => {
  try {
    const hostId = Number(req.params.hostId);
    const sessionId = Number(req.params.sessionId);

    const { data: session, error: sessionError } = await supabase
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
      .eq("session_id", sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: "找不到遊戲場次",
      });
    }

    if (Number(session.quizzes?.host_id) !== hostId) {
      return res.status(403).json({
        success: false,
        error: "你不能查看別人的主持紀錄",
      });
    }

    const { data: leaderboard, error: leaderboardError } = await supabase
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

    if (leaderboardError) {
      return res.status(500).json({
        success: false,
        error: leaderboardError.message,
      });
    }

    const { data: answers, error: answersError } = await supabase
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
      .eq("session_id", sessionId)
      .order("question_id", { ascending: true });

    if (answersError) {
      return res.status(500).json({
        success: false,
        error: answersError.message,
      });
    }

    res.json({
      success: true,
      session,
      quiz: session.quizzes,
      leaderboard: leaderboard || [],
      answers: answers || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =========================
   Socket.io Events + WebRTC Signaling
========================= */

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-session", async ({ sessionId, userId, role }) => {
    try {
      if (!sessionId) return;

      const room = `session:${sessionId}`;
      socket.join(room);

      socket.data.sessionId = Number(sessionId);
      socket.data.userId = userId ? Number(userId) : null;
      socket.data.role = role || "player";

      const fullData = await getSessionFullData(Number(sessionId));
      const leaderboard = await getLeaderboard(Number(sessionId));

      socket.emit("session-sync", {
        ...fullData,
        leaderboard,
      });

      socket.to(room).emit("user-connected", {
        socketId: socket.id,
        userId,
        role,
      });
    } catch (err) {
      socket.emit("socket-error", { error: err.message });
    }
  });

  socket.on("start-game", async ({ sessionId }) => {
    try {
      const { data: session, error } = await supabase
        .from("game_sessions")
        .update({
          started_at: new Date().toISOString(),
          current_question: 0,
          game_finished: false,
        })
        .eq("session_id", Number(sessionId))
        .select(GAME_SESSION_SELECT)
        .single();

      if (error) throw new Error(error.message);

      io.to(`session:${sessionId}`).emit("game-started", { session });
    } catch (err) {
      socket.emit("socket-error", { error: err.message });
    }
  });

  socket.on("next-question", async ({ sessionId, currentQuestion }) => {
    try {
      const nextQuestion = Number(currentQuestion) + 1;

      const { data: session, error } = await supabase
        .from("game_sessions")
        .update({
          current_question: nextQuestion,
        })
        .eq("session_id", Number(sessionId))
        .select(GAME_SESSION_SELECT)
        .single();

      if (error) throw new Error(error.message);

      io.to(`session:${sessionId}`).emit("question-changed", { session });
    } catch (err) {
      socket.emit("socket-error", { error: err.message });
    }
  });

  socket.on("finish-game", async ({ sessionId }) => {
    try {
      const { data: session, error } = await supabase
        .from("game_sessions")
        .update({
          game_finished: true,
          ended_at: new Date().toISOString(),
        })
        .eq("session_id", Number(sessionId))
        .select(GAME_SESSION_SELECT)
        .single();

      if (error) throw new Error(error.message);

      const leaderboard = await getLeaderboard(Number(sessionId));

      io.to(`session:${sessionId}`).emit("game-finished", {
        session,
        leaderboard,
      });
    } catch (err) {
      socket.emit("socket-error", { error: err.message });
    }
  });

  /* =========================
     WebRTC Signaling
  ========================= */

  socket.on("webrtc-host-ready", ({ sessionId, userId }) => {
    const room = `session:${sessionId}`;

    socket.data.sessionId = Number(sessionId);
    socket.data.userId = userId ? Number(userId) : null;
    socket.data.role = "host";

    socket.join(room);

    socket.to(room).emit("webrtc-host-ready", {
      hostSocketId: socket.id,
      userId,
    });

    console.log("WebRTC host ready:", socket.id);
  });

  socket.on("webrtc-player-ready", ({ sessionId, userId, user }) => {
    const room = `session:${sessionId}`;

    socket.data.sessionId = Number(sessionId);
    socket.data.userId = userId ? Number(userId) : null;
    socket.data.role = "player";

    socket.join(room);

    socket.to(room).emit("webrtc-player-ready", {
      playerSocketId: socket.id,
      userId,
      user,
    });

    console.log("WebRTC player ready:", socket.id);
  });

  socket.on("webrtc-offer", ({ to, fromUserId, offer }) => {
    if (!to || !offer) return;

    io.to(to).emit("webrtc-offer", {
      from: socket.id,
      fromUserId,
      offer,
    });
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    if (!to || !answer) return;

    io.to(to).emit("webrtc-answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;

    io.to(to).emit("webrtc-ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("disconnect", () => {
    const sessionId = socket.data.sessionId;
    const userId = socket.data.userId;
    const role = socket.data.role;

    if (sessionId) {
      socket.to(`session:${sessionId}`).emit("webrtc-user-disconnected", {
        socketId: socket.id,
        userId,
        role,
      });
    }

    console.log("Socket disconnected:", socket.id);
  });
});

app.get("/api/ice-config", (req, res) => {
  res.json({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: process.env.TURN_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
      {
        urls: process.env.TURNS_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
    ],
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});