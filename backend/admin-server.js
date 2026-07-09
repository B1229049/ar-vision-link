import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.ADMIN_PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_ALLOWED_TABLES = {
  quizzes: "quiz_id",
  questions: "question_id",
  game_sessions: "session_id",
  player_records: "record_id",
  user_face_images: "id",
  vision_sessions: "id",
  vision_detection_logs: "id",
  player_answers: "answer_id",
};

app.get("/", (req, res) => {
  res.send("Admin server is running");
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        name,
        nickname,
        description,
        extra_info,
        profile_url,
        is_active,
        role,
        admin,
        created_at,
        updated_at
      `)
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, users: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      nickname,
      description,
      extra_info,
      profile_url,
      is_active,
      role,
      admin,
    } = req.body;

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) payload.name = name?.trim();
    if (nickname !== undefined) payload.nickname = nickname?.trim() || null;
    if (description !== undefined) payload.description = description?.trim() || null;
    if (extra_info !== undefined) payload.extra_info = extra_info?.trim() || null;
    if (profile_url !== undefined) payload.profile_url = profile_url?.trim() || null;
    if (is_active !== undefined) payload.is_active = !!is_active;
    if (role !== undefined) payload.role = role;
    if (admin !== undefined) payload.admin = !!admin;

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select(`
        id,
        name,
        nickname,
        description,
        extra_info,
        profile_url,
        is_active,
        role,
        admin,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, deleted: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/:table", async (req, res) => {
  try {
    const { table } = req.params;

    if (!ADMIN_ALLOWED_TABLES[table]) {
      return res.status(400).json({
        success: false,
        error: "Table not allowed",
      });
    }

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(ADMIN_ALLOWED_TABLES[table], { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, rows: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Admin server running on port ${PORT}`);
});
