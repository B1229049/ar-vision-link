import express from "express";
import { supabase } from "../supabaseClient.js";

import {
  USER_PUBLIC_SELECT,
} from "../constants/selects.js";

import {
  getActiveUsersWithEmbeddings,
  clearUserEmbeddingCache,
} from "../services/faceService.js";

const router = express.Router();

router.post("/face-login", async (req, res) => {
  try {
    const { descriptor } = req.body;

    if (!Array.isArray(descriptor)) {
      return res.status(400).json({
        success: false,
        error: "descriptor 必須是陣列",
      });
    }

    const users =
      await getActiveUsersWithEmbeddings();

    let bestUser = null;
    let bestDistance = Infinity;

    for (const user of users || []) {
      if (
        !Array.isArray(
          user.face_embedding
        ) ||
        user.face_embedding.length !==
          descriptor.length
      ) {
        continue;
      }

      let sum = 0;

      for (
        let i = 0;
        i < descriptor.length;
        i++
      ) {
        const diff =
          Number(descriptor[i]) -
          Number(
            user.face_embedding[i]
          );

        sum += diff * diff;
      }

      const distance =
        Math.sqrt(sum);

      if (
        distance < bestDistance
      ) {
        bestDistance =
          distance;
        bestUser = user;
      }
    }

    if (
      !bestUser ||
      bestDistance > 0.5
    ) {
      return res.json({
        success: false,
        error:
          "找不到符合的人臉",
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

router.put(
  "/users/:id/face",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        face_embedding,
        avatar_url,
      } = req.body;

      if (
        !Array.isArray(
          face_embedding
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            "face_embedding 必須是陣列",
        });
      }

      const { data, error } =
        await supabase
          .from("users")
          .update({
            face_embedding:
              face_embedding.map(
                Number
              ),
            avatar_url,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .select(
            USER_PUBLIC_SELECT
          )
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
  }
);

router.post(
  "/face-recognize-batch",
  async (req, res) => {
    try {
      const { descriptors } =
        req.body;

      if (
        !Array.isArray(
          descriptors
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            "descriptors 必須是陣列",
        });
      }

      const users =
        await getActiveUsersWithEmbeddings();

      const results = [];

      for (const descriptor of descriptors) {
        let bestUser = null;
        let bestDistance =
          Infinity;

        for (const user of users || []) {
          if (
            !Array.isArray(
              user.face_embedding
            ) ||
            user.face_embedding
              .length !==
              descriptor.length
          ) {
            continue;
          }

          let sum = 0;

          for (
            let i = 0;
            i <
            descriptor.length;
            i++
          ) {
            const diff =
              Number(
                descriptor[i]
              ) -
              Number(
                user
                  .face_embedding[
                  i
                ]
              );

            sum += diff * diff;
          }

          const distance =
            Math.sqrt(sum);

          if (
            distance <
            bestDistance
          ) {
            bestDistance =
              distance;
            bestUser = user;
          }
        }

        if (
          bestUser &&
          bestDistance < 0.45
        ) {
          const safeUser = {
            ...bestUser,
          };

          delete safeUser.face_embedding;

          results.push({
            user: safeUser,
            distance:
              bestDistance,
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
  }
);

export default router;