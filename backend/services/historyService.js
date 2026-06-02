import { supabase } from "../supabaseClient.js";

export async function getPlayerRank(
  sessionId,
  userId
) {
  const { data } = await supabase
    .from("player_records")
    .select("user_id, score")
    .eq("session_id", sessionId)
    .order("score", { ascending: false });

  const rank =
    (data || []).findIndex(
      (item) => Number(item.user_id) === Number(userId)
    ) + 1;

  return {
    rank,
    playerCount: data?.length || 0,
  };
}