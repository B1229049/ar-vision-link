import { supabase } from "../supabaseClient.js";
import { USER_PRIVATE_SELECT } from "../constants/selects.js";

let userEmbeddingCache = null;
let userEmbeddingCacheTime = 0;

const USER_EMBEDDING_CACHE_TTL = 30 * 1000;

export async function getActiveUsersWithEmbeddings() {
  const now = Date.now();

  if (
    userEmbeddingCache &&
    now - userEmbeddingCacheTime < USER_EMBEDDING_CACHE_TTL
  ) {
    return userEmbeddingCache;
  }

  const { data, error } = await supabase
    .from("users")
    .select(USER_PRIVATE_SELECT)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  userEmbeddingCache = data || [];
  userEmbeddingCacheTime = now;

  return userEmbeddingCache;
}

export function clearUserEmbeddingCache() {
  userEmbeddingCache = null;
  userEmbeddingCacheTime = 0;
}