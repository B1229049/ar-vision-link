export function calculateScore(isCorrect, timeLeft = 0) {
  if (!isCorrect) return 0;

  const baseScore = 1000;
  const bonus = Math.max(Number(timeLeft) || 0, 0) * 10;

  return baseScore + bonus;
}