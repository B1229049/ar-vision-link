export function cleanQuestion(question) {
  if (!question) return null;

  return {
    question_text: String(question.question_text || "").trim(),
    option_a: String(question.option_a || "").trim(),
    option_b: String(question.option_b || "").trim(),
    option_c: String(question.option_c || "").trim(),
    option_d: String(question.option_d || "").trim(),
    correct_answer: String(
      question.correct_answer || "A"
    ).toUpperCase(),
    time_limit: Number(question.time_limit || 20),
  };
}

export function validateQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map(cleanQuestion)
    .filter((q) => {
      return (
        q &&
        q.question_text &&
        q.option_a &&
        q.option_b &&
        q.option_c &&
        q.option_d
      );
    });
}