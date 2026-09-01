export const QUIZ_ICON_COLORS = [
  "#ffd84d",
  "#53d4ff",
  "#ff79b0",
  "#43d98c",
  "#ff9f43",
  "#5b9dff",
];

export function getQuizInitial(title) {
  return Array.from(String(title || "測驗").trim())[0] || "測";
}

export function getQuizColor(title, identity = "") {
  const value = `${String(title || "測驗")}:${String(identity)}`;
  const hash = Array.from(value).reduce(
    (total, character) => (total * 31 + (character.codePointAt(0) || 0)) >>> 0,
    0
  );

  return QUIZ_ICON_COLORS[hash % QUIZ_ICON_COLORS.length];
}
