import { supabase } from "../supabaseClient.js";

export function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

export async function createUniqueRoomCode() {
  for (let i = 0; i < 10; i++) {
    const roomCode = generateRoomCode();

    const { data, error } = await supabase
      .from("game_sessions")
      .select("session_id")
      .eq("room_code", roomCode)
      .is("ended_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      return roomCode;
    }
  }

  throw new Error("無法產生唯一房號，請重試");
}