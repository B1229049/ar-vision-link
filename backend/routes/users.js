import express from "express";
import { supabase } from "../supabaseClient.js";
import {
  USER_PUBLIC_SELECT,
} from "../constants/selects.js";

import {
  clearUserEmbeddingCache,
} from "../services/faceService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(USER_PUBLIC_SELECT)
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      users: data || [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post("/register", async (req, res) => {
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

    if (
      !Array.isArray(face_embedding) ||
      face_embedding.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "face_embedding 必須是數字陣列",
      });
    }

    const cleanEmbedding =
      face_embedding.map(Number);

    const { data, error } =
      await supabase
        .from("users")
        .insert([
          {
            name: name.trim(),
            nickname:
              nickname?.trim() || "",
            description:
              description?.trim() || "",
            extra_info:
              extra_info?.trim() || "",
            avatar_url:
              avatar_url || "",
            is_active: true,
            face_embedding:
              cleanEmbedding,
          },
        ])
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

router.put("/:id", async (req, res) => {
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
      updated_at:
        new Date().toISOString(),
    };

    if (name !== undefined)
      updateData.name = name;

    if (nickname !== undefined)
      updateData.nickname =
        nickname;

    if (description !== undefined)
      updateData.description =
        description;

    if (extra_info !== undefined)
      updateData.extra_info =
        extra_info;

    if (avatar_url !== undefined)
      updateData.avatar_url =
        avatar_url;

    if (is_active !== undefined)
      updateData.is_active =
        is_active;

    const { data, error } =
      await supabase
        .from("users")
        .update(updateData)
        .eq("id", id)
        .select(USER_PUBLIC_SELECT)
        .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

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

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } =
      await supabase
        .from("users")
        .update({
          is_active: false,
          updated_at:
            new Date().toISOString(),
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

export default router;