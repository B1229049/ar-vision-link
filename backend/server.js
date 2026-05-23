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

app.get("/", (req, res) => {
  res.send("AR Vision Link backend is running");
});

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});