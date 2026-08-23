const ADMIN_ALLOWED_TABLES = {
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
  ar_selfies: "id",
};

export function registerAdminRoutes(app, supabase) {

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