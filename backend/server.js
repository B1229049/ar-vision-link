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

app.get("/api/users", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, nickname, description, extra_info, face_embedding");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ users: data });
});

app.post("/api/users/register", async (req, res) => {
  const {
    name,
    nickname,
    description,
    extra_info,
    face_embedding,
  } = req.body;

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        name,
        nickname,
        description,
        extra_info,
        face_embedding,
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ user: data });
});

app.get("/", (req, res) => {
  res.send("AR Vision Link backend is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});