import { supabase } from "../supabaseClient.js";

export async function getLeaderboard(sessionId) {
  const { data, error } = await supabase
    .from("player_records")
    .select(`
      record_id,
      session_id,
      user_id,
      score,
      joined_at,
      users (
        id,
        name,
        nickname,
        avatar_url
      )
    `)
    .eq("session_id", sessionId)
    .order("score", { ascending: false });

  if (error) throw new Error(error.message);

  return data || [];
}