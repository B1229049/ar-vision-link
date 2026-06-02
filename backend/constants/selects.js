export const USER_PUBLIC_SELECT = `
  id,
  name,
  nickname,
  description,
  extra_info,
  avatar_url,
  is_active,
  created_at,
  updated_at
`;

export const USER_PRIVATE_SELECT = `
  id,
  name,
  nickname,
  description,
  extra_info,
  avatar_url,
  is_active,
  created_at,
  updated_at,
  face_embedding
`;

export const QUIZ_SELECT = `
  quiz_id,
  host_id,
  title,
  created_at
`;

export const QUESTION_SELECT = `
  question_id,
  quiz_id,
  question_text,
  options,
  correct_answer,
  time_limit,
  created_at
`;

export const GAME_SESSION_SELECT = `
  session_id,
  quiz_id,
  room_code,
  started_at,
  ended_at,
  current_question,
  game_finished
`;

export const PLAYER_RECORD_SELECT = `
  record_id,
  session_id,
  user_id,
  score,
  joined_at
`;

export const PLAYER_ANSWER_SELECT = `
  answer_id,
  session_id,
  question_id,
  user_id,
  answer,
  is_correct,
  score,
  answered_at
`;