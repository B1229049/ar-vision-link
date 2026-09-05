const ADMIN_ALLOWED_TABLES = {
  coin_rewards: "id",
  coin_reward_claims: "reward_id",
  quizzes: "quiz_id",
  questions: "question_id",
  game_sessions: "session_id",
  player_records: "record_id",
  user_face_images: "id",
  user_face_embeddings: "id",
  vision_sessions: "id",
  vision_detection_logs: "id",
  player_answers: "answer_id",
  avatar_item_settings: "id",
};

const REWARD_COIN_OPTIONS = new Set([50, 100, 200, 300, 1000]);

async function isAdminUser(supabase, userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("admin", true)
    .eq("is_active", true)
    .maybeSingle();

  return !error && Boolean(data);
}

export function registerAdminRoutes(app, supabase) {

  app.post("/api/admin/rewards", async (req, res) => {
    try {
      const coins = Number(req.body?.coins);
      const createdBy = Number(req.body?.created_by);
      const expiresAt = new Date(req.body?.expires_at);

      if (!(await isAdminUser(supabase, createdBy))) {
        return res.status(403).json({ success: false, error: "只有管理員能派發獎勵" });
      }
      if (!REWARD_COIN_OPTIONS.has(coins)) {
        return res.status(400).json({ success: false, error: "不支援的金幣數量" });
      }
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        return res.status(400).json({ success: false, error: "截止時間必須晚於現在" });
      }
      if (expiresAt.getTime() > Date.now() + 6 * 24 * 60 * 60 * 1000) {
        return res.status(400).json({ success: false, error: "截止日期最多可選擇五天後" });
      }

      const { data, error } = await supabase
        .from("coin_rewards")
        .insert({ coins, expires_at: expiresAt.toISOString(), created_by: createdBy })
        .select("id, token, coins, expires_at, created_at")
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, reward: data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/admin/rewards", async (req, res) => {
    try {
      const adminId = Number(req.query.admin_id);
      if (!(await isAdminUser(supabase, adminId))) {
        return res.status(403).json({ success: false, error: "只有管理員能查看獎勵" });
      }

      const { data, error } = await supabase
        .from("coin_rewards")
        .select("id, token, coins, expires_at, created_at, coin_reward_claims(count)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      res.json({ success: true, rewards: data || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================
  // GET /api/admin/users
  // =========================
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          name,
          nickname,
          description,
          profile_url,
          is_active,
          role,
          admin,
          coins,
          owned_outfits,
          created_at,
          updated_at
        `)
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


  // =========================
  // PUT /api/admin/users/:id
  // =========================
  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        nickname,
        description,
        profile_url,
        is_active,
        role,
        admin,
      } = req.body;

      const payload = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) {
        payload.name = name?.trim();
      }

      if (nickname !== undefined) {
        payload.nickname = nickname?.trim() || null;
      }

      if (description !== undefined) {
        payload.description =
          description?.trim() || null;
      }

      if (profile_url !== undefined) {
        payload.profile_url =
          profile_url?.trim() || null;
      }

      if (is_active !== undefined) {
        payload.is_active = !!is_active;
      }

      if (role !== undefined) {
        payload.role = role;
      }

      if (admin !== undefined) {
        payload.admin = !!admin;
      }

      const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", id)
        .select(`
          id,
          name,
          nickname,
          description,
          profile_url,
          is_active,
          role,
          admin,
          created_at,
          updated_at
        `)
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


  // =========================
  // DELETE /api/admin/users/:id
  // =========================
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
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      res.json({
        success: true,
        deleted: data,
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });


  // =========================
  // GET /api/admin/:table
  // =========================
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
        .order(
          ADMIN_ALLOWED_TABLES[table],
          { ascending: true }
        );

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      res.json({
        success: true,
        rows: data || [],
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

}
