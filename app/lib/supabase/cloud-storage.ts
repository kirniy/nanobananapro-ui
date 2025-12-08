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
