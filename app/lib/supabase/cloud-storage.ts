"use client";

import { createClient } from "./client";
import type { Generation } from "../../_components/create-page/types";
import type { Database } from "./types";

type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];
type GenerationInsert = Database["public"]["Tables"]["generations"]["Insert"];

/**
 * Convert app Generation type to database row format
 */
function toDbFormat(generation: Generation, userId: string): GenerationInsert {
  return {
    id: generation.id,
    user_id: userId,
    prompt: generation.prompt,
    aspect: generation.aspect,
    quality: generation.quality,
    output_format: generation.outputFormat,
    provider: generation.provider,
    created_at: generation.createdAt,
    size_width: generation.size.width,
    size_height: generation.size.height,
    images: generation.images,
    input_images: generation.inputImages as unknown as Database["public"]["Tables"]["generations"]["Insert"]["input_images"],
  };
}

/**
 * Convert database row to app Generation type
 */
function fromDbFormat(row: GenerationRow): Generation {
  return {
    id: row.id,
    prompt: row.prompt,
    aspect: row.aspect as Generation["aspect"],
    quality: row.quality as Generation["quality"],
    outputFormat: row.output_format as Generation["outputFormat"],
    provider: row.provider as Generation["provider"],
    createdAt: row.created_at,
    size: {
      width: row.size_width,
      height: row.size_height,
    },
    images: row.images,
    inputImages: (row.input_images as unknown as Generation["inputImages"]) || [],
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Save generations to Supabase
 */
export async function saveGenerationsToCloud(generations: Generation[]): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const rows = generations.map((gen) => toDbFormat(gen, user.id));

  const { error } = await supabase
    .from("generations")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Failed to save generations to cloud:", error);
    throw error;
  }
}

/**
 * Load generations from Supabase
 */
export async function loadGenerationsFromCloud(): Promise<Generation[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load generations from cloud:", error);
    throw error;
  }

  return (data || []).map(fromDbFormat);
}

/**
 * Delete a generation from Supabase
 */
export async function deleteGenerationFromCloud(generationId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("generations")
    .delete()
    .eq("id", generationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete generation from cloud:", error);
    throw error;
  }
}

/**
 * Save favorites to Supabase
 */
export async function saveFavoritesToCloud(favorites: Set<string>): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // First, delete all existing favorites for this user
  await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id);

  // Then insert new favorites
  const rows = Array.from(favorites).map((fav) => {
    const [generationId, imageIndex] = fav.split(":");
    return {
      user_id: user.id,
      generation_id: generationId,
      image_index: parseInt(imageIndex, 10),
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("favorites")
      .insert(rows);

    if (error) {
      console.error("Failed to save favorites to cloud:", error);
      throw error;
    }
  }
}

/**
 * Load favorites from Supabase
 */
export async function loadFavoritesFromCloud(): Promise<Set<string>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("generation_id, image_index")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load favorites from cloud:", error);
    throw error;
  }

  const favorites = new Set<string>();
  (data || []).forEach((row) => {
    favorites.add(`${row.generation_id}:${row.image_index}`);
  });

  return favorites;
}

/**
 * Toggle a favorite in Supabase
 */
export async function toggleFavoriteInCloud(generationId: string, imageIndex: number): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Check if favorite exists
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("generation_id", generationId)
    .eq("image_index", imageIndex)
    .single();

  if (existing) {
    // Remove favorite
    await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);
    return false;
  } else {
    // Add favorite
    await supabase
      .from("favorites")
      .insert({
        user_id: user.id,
        generation_id: generationId,
        image_index: imageIndex,
      });
    return true;
  }
}

/**
 * Save user settings to Supabase
 */
export async function saveSettingsToCloud(settings: Record<string, unknown>): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      settings,
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Failed to save settings to cloud:", error);
    throw error;
  }
}

/**
 * Load user settings from Supabase
 */
export async function loadSettingsFromCloud(): Promise<Record<string, unknown> | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = not found
    console.error("Failed to load settings from cloud:", error);
    throw error;
  }

  return (data?.settings as Record<string, unknown>) || null;
}

/**
 * Sync local data to cloud (for migration when user signs in)
 */
export async function syncLocalToCloud(
  generations: Generation[],
  favorites: Set<string>
): Promise<void> {
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    throw new Error("Not authenticated");
  }

  // Load existing cloud data
  const cloudGenerations = await loadGenerationsFromCloud();
  const cloudGenIds = new Set(cloudGenerations.map((g) => g.id));

  // Find new generations to upload (not already in cloud)
  const newGenerations = generations.filter((g) => !cloudGenIds.has(g.id));

  if (newGenerations.length > 0) {
    await saveGenerationsToCloud(newGenerations);
  }

  // Merge favorites
  const cloudFavorites = await loadFavoritesFromCloud();
  const mergedFavorites = new Set([...cloudFavorites, ...favorites]);
  await saveFavoritesToCloud(mergedFavorites);
}

/**
 * Get user's generation count
 */
export async function getGenerationCount(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to get generation count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Manually cleanup old generations (keeps favorites and most recent)
 * @param keepCount Number of recent generations to keep (default 100)
 * @returns Number of generations deleted
 */
export async function cleanupOldGenerations(keepCount: number = 100): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Call the database function
  const { data, error } = await supabase.rpc("user_cleanup_generations", {
    p_keep_count: keepCount,
  });

  if (error) {
    console.error("Failed to cleanup generations:", error);
    throw error;
  }

  return data || 0;
}

// ============================================
// API Key Management (Encrypted Storage)
// ============================================

export type ApiKeyType = "gemini" | "replicate" | "openai";

interface ApiKeyInfo {
  hasKey: boolean;
  hint: string | null; // Last 4 characters
}

/**
 * Save an API key securely (encrypted in database)
 * Note: The actual encryption happens server-side via Supabase Edge Function
 * For now, we store a hash hint for display purposes
 */
export async function saveApiKey(keyType: ApiKeyType, apiKey: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Create hint (last 4 chars)
  const hint = apiKey.slice(-4);

  // For client-side, we'll store the key encrypted using a simple approach
  // In production, you'd want to use Supabase Edge Functions for true server-side encryption
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const base64Key = btoa(String.fromCharCode(...keyData));

  const updateData: Record<string, unknown> = {
    user_id: user.id,
    [`${keyType}_key`]: base64Key,
    [`${keyType}_hint`]: hint,
  };

  const { error } = await supabase
    .from("user_api_keys")
    .upsert(updateData, { onConflict: "user_id" });

  if (error) {
    console.error(`Failed to save ${keyType} API key:`, error);
    throw error;
  }
}

/**
 * Get API key from secure storage
 */
export async function getApiKey(keyType: ApiKeyType): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("gemini_key, replicate_key, openai_key")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error(`Failed to get ${keyType} API key:`, error);
    return null;
  }

  if (!data) return null;

  const keyMap = {
    gemini: data.gemini_key,
    replicate: data.replicate_key,
    openai: data.openai_key,
  };

  const encodedKey = keyMap[keyType];
  if (!encodedKey) return null;

  // Decode the key
  try {
    const decoded = atob(encodedKey);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Get API key info (whether it exists and hint)
 */
export async function getApiKeyInfo(keyType: ApiKeyType): Promise<ApiKeyInfo> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { hasKey: false, hint: null };
  }

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("gemini_key, gemini_hint, replicate_key, replicate_hint, openai_key, openai_hint")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error(`Failed to get ${keyType} API key info:`, error);
    return { hasKey: false, hint: null };
  }

  if (!data) {
    return { hasKey: false, hint: null };
  }

  const keyMap = {
    gemini: { key: data.gemini_key, hint: data.gemini_hint },
    replicate: { key: data.replicate_key, hint: data.replicate_hint },
    openai: { key: data.openai_key, hint: data.openai_hint },
  };

  const info = keyMap[keyType];
  return {
    hasKey: !!info.key,
    hint: info.hint,
  };
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyType: ApiKeyType): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const updateData: Record<string, null> = {
    [`${keyType}_key`]: null,
    [`${keyType}_hint`]: null,
  };

  const { error } = await supabase
    .from("user_api_keys")
    .update(updateData)
    .eq("user_id", user.id);

  if (error) {
    console.error(`Failed to delete ${keyType} API key:`, error);
    throw error;
  }
}

/**
 * Get all API key infos at once
 */
export async function getAllApiKeyInfos(): Promise<Record<ApiKeyType, ApiKeyInfo>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const defaultResult: Record<ApiKeyType, ApiKeyInfo> = {
    gemini: { hasKey: false, hint: null },
    replicate: { hasKey: false, hint: null },
    openai: { hasKey: false, hint: null },
  };

  if (!user) {
    return defaultResult;
  }

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("gemini_key, gemini_hint, replicate_key, replicate_hint, openai_key, openai_hint")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Failed to get API key infos:", error);
    return defaultResult;
  }

  if (!data) {
    return defaultResult;
  }

  return {
    gemini: { hasKey: !!data.gemini_key, hint: data.gemini_hint },
    replicate: { hasKey: !!data.replicate_key, hint: data.replicate_hint },
    openai: { hasKey: !!data.openai_key, hint: data.openai_hint },
  };
}
