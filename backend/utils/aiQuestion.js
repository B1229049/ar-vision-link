export function cleanQuestion(q) {
  return {
    question_text: String(q.question_text || "").trim(),

    option_a: String(q.option_a || "").trim(),

    option_b: String(q.option_b || "").trim(),

    option_c: String(q.option_c || "").trim(),

    option_d: String(q.option_d || "").trim(),

    correct_answer: ["A", "B", "C", "D"].includes(
      q.correct_answer
    )
      ? q.correct_answer
      : "A",

    time_limit: Number(q.time_limit) || 20,
  };
}

export function validateQuestions(
  questions,
  expectedCount = 5
) {
  if (!Array.isArray(questions)) {
    throw new Error("AI 回傳不是題目陣列");
  }

  const cleaned = questions.map(cleanQuestion);

  const validQuestions = cleaned.filter((q) => {
    if (!q.question_text) return false;

    if (
      !q.option_a ||
      !q.option_b ||
      !q.option_c ||
      !q.option_d
    ) {
      return false;
    }

    const options = [
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
    ];

    const uniqueOptions = new Set(options);

    if (uniqueOptions.size < 4) {
      return false;
    }

    if (
      !["A", "B", "C", "D"].includes(
        q.correct_answer
      )
    ) {
      return false;
    }

    return true;
  });

  if (validQuestions.length === 0) {
    throw new Error(
      "AI 產生的題目全部不合格，請重新產生"
    );
  }

  return validQuestions.slice(
    0,
    Number(expectedCount) || 5
  );
}