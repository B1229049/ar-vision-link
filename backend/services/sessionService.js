import { supabase } from "../supabaseClient.js";

import {
  GAME_SESSION_SELECT,
  QUIZ_SELECT,
  QUESTION_SELECT,
} from "../constants/selects.js";

export async function getSessionFullData(sessionId) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select(GAME_SESSION_SELECT)
    .eq("session_id", sessionId)
    .single();

  if (sessionError) throw new Error(sessionError.message);

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(QUIZ_SELECT)
    .eq("quiz_id", session.quiz_id)
    .single();

  if (quizError) throw new Error(quizError.message);

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select(QUESTION_SELECT)
    .eq("quiz_id", session.quiz_id)
    .order("question_id", { ascending: true });

  if (questionsError) throw new Error(questionsError.message);

  return {
    session,
    quiz,
    questions: questions || [],
  };
}