import express from "express";
import multer from "multer";

import { gemini } from "../geminiClient.js";
import { validateQuestions } from "../utils/aiQuestion.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

/* =========================
   AI Generate Quiz (Text)
========================= */

router.post("/generate-quiz", async (req, res) => {
  try {
    const {
      text,
      question_count = 5,
      difficulty = "normal",
    } = req.body;

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

    const response =
      await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType:
            "application/json",
        },
      });

    const rawText =
      response.text;

    let questions;

    try {
      questions =
        JSON.parse(rawText);
    } catch (err) {
      console.error(
        "Gemini 回傳內容不是合法 JSON：",
        rawText
      );

      return res.status(500).json({
        success: false,
        error:
          "AI 回傳格式錯誤，請重試",
      });
    }

    if (
      !Array.isArray(questions)
    ) {
      return res.status(500).json({
        success: false,
        error:
          "AI 回傳不是題目陣列",
      });
    }

    const cleanQuestions =
      validateQuestions(
        questions,
        question_count
      );

    res.json({
      success: true,
      questions:
        cleanQuestions,
    });
  } catch (err) {
    console.error(
      "Gemini generate quiz error:",
      err
    );

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =========================
   AI Generate Quiz (PDF)
========================= */

router.post(
  "/generate-quiz-pdf",
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        question_count = 5,
        difficulty = "normal",
      } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "請上傳 PDF 檔案",
        });
      }

      if (
        req.file.mimetype !==
        "application/pdf"
      ) {
        return res.status(400).json({
          success: false,
          error: "只支援 PDF 檔案",
        });
      }

      const pdfBase64 =
        req.file.buffer.toString(
          "base64"
        );

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

      const response =
        await gemini.models.generateContent(
          {
            model:
              "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType:
                        "application/pdf",
                      data:
                        pdfBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            config: {
              responseMimeType:
                "application/json",
            },
          }
        );

      let questions;

      try {
        questions =
          JSON.parse(
            response.text
          );
      } catch (err) {
        console.error(
          "Gemini 回傳不是 JSON：",
          response.text
        );

        return res.status(500).json({
          success: false,
          error:
            "AI 回傳格式錯誤",
        });
      }

      const cleanQuestions =
        questions.map((q) => ({
          question_text:
            q.question_text ||
            "",

          option_a:
            q.option_a || "",

          option_b:
            q.option_b || "",

          option_c:
            q.option_c || "",

          option_d:
            q.option_d || "",

          correct_answer:
            [
              "A",
              "B",
              "C",
              "D",
            ].includes(
              q.correct_answer
            )
              ? q.correct_answer
              : "A",

          time_limit:
            Number(
              q.time_limit
            ) || 20,
        }));

      res.json({
        success: true,
        questions:
          cleanQuestions,
      });
    } catch (err) {
      console.error(
        "PDF AI 出題失敗：",
        err
      );

      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

export default router;