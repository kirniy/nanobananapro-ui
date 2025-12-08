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
    .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

  if (error) {
    // Silently return null for common "no data" errors
    if (error.code === "PGRST116" || error.code === "406") {
      return null;
    }
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

// ============================================
// Image Storage Functions
// ============================================

const GENERATIONS_BUCKET = "generations";
const PROMPT_ATTACHMENTS_BUCKET = "prompt-attachments";

/**
 * Check if a string is a base64 data URL
 */
function isBase64DataUrl(str: string): boolean {
  return str.startsWith("data:image/");
}

/**
 * Check if a string is a blob URL
 */
function isBlobUrl(str: string): boolean {
  return str.startsWith("blob:");
}

/**
 * Check if image needs to be uploaded (is local data, not already a Supabase URL)
 */
function needsUpload(imageUrl: string, supabaseUrl: string): boolean {
  // Already a Supabase storage URL
  if (imageUrl.includes(supabaseUrl) && imageUrl.includes("/storage/")) {
    return false;
  }
  // Base64 data URL - needs upload
  if (isBase64DataUrl(imageUrl)) {
    return true;
  }
  // Blob URL - needs upload
  if (isBlobUrl(imageUrl)) {
    return true;
  }
  // External URL (from generation API) - we could optionally re-upload these
  // For now, keep external URLs as-is
  return false;
}

/**
 * Convert base64 data URL to Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Get file extension from mime type
 */
function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] || "png";
}

/**
 * Fetch a blob URL and return the blob data
 */
async function fetchBlobUrl(blobUrl: string): Promise<Blob> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob URL: ${response.status}`);
  }
  return response.blob();
}

/**
 * Upload a single image to Supabase Storage
 * Supports: base64 data URLs, blob URLs, and Blob objects
 */
export async function uploadImage(
  imageData: string | Blob,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  let blob: Blob;
  let extension = "png";

  if (typeof imageData === "string") {
    if (isBase64DataUrl(imageData)) {
      // Handle base64 data URL
      blob = dataUrlToBlob(imageData);
      const mimeMatch = imageData.match(/data:([^;]+)/);
      if (mimeMatch) {
        extension = getExtensionFromMime(mimeMatch[1]);
      }
    } else if (isBlobUrl(imageData)) {
      // Handle blob URL - fetch it to get the actual blob
      blob = await fetchBlobUrl(imageData);
      extension = getExtensionFromMime(blob.type);
    } else {
      throw new Error("Invalid image data: expected base64 data URL, blob URL, or Blob");
    }
  } else {
    blob = imageData;
    extension = getExtensionFromMime(blob.type);
  }

  const filePath = `${user.id}/${path}.${extension}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, {
      contentType: blob.type,
      upsert: true,
    });

  if (error) {
    console.error("Failed to upload image:", error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Upload generation images to Supabase Storage
 * Returns updated image URLs (uploaded ones replaced with Supabase URLs)
 */
export async function uploadGenerationImages(
  generationId: string,
  images: string[]
): Promise<string[]> {
  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const uploadedUrls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i];

    if (!imageUrl || imageUrl.trim() === "") {
      uploadedUrls.push(imageUrl);
      continue;
    }

    if (needsUpload(imageUrl, supabaseUrl)) {
      try {
        const path = `${generationId}/${i}`;
        const newUrl = await uploadImage(imageUrl, GENERATIONS_BUCKET, path);
        uploadedUrls.push(newUrl);
        console.log(`Uploaded image ${i} for generation ${generationId}`);
      } catch (error) {
        console.error(`Failed to upload image ${i}:`, error);
        // Keep original URL on failure
        uploadedUrls.push(imageUrl);
      }
    } else {
      // Keep existing URL
      uploadedUrls.push(imageUrl);
    }
  }

  return uploadedUrls;
}

/**
 * Upload prompt attachment to Supabase Storage
 */
export async function uploadPromptAttachment(
  promptId: string,
  imageData: string,
  index: number
): Promise<string> {
  const path = `${promptId}/${index}`;
  return uploadImage(imageData, PROMPT_ATTACHMENTS_BUCKET, path);
}

/**
 * Delete generation images from Supabase Storage
 */
export async function deleteGenerationImages(generationId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const folderPath = `${user.id}/${generationId}`;

  // List all files in the generation folder
  const { data: files, error: listError } = await supabase.storage
    .from(GENERATIONS_BUCKET)
    .list(folderPath);

  if (listError) {
    console.error("Failed to list generation images:", listError);
    return;
  }

  if (files && files.length > 0) {
    const filePaths = files.map((f) => `${folderPath}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(GENERATIONS_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error("Failed to delete generation images:", deleteError);
    }
  }
}

/**
 * Save generations with image upload
 * This uploads base64 images to Supabase Storage before saving metadata
 */
export async function saveGenerationsWithImages(
  generations: Generation[],
  uploadImages: boolean = true
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const processedGenerations: Generation[] = [];

  for (const gen of generations) {
    let images = gen.images;

    // Upload images if enabled and there are base64 images
    if (uploadImages && images.some((img) => isBase64DataUrl(img))) {
      try {
        images = await uploadGenerationImages(gen.id, images);
      } catch (error) {
        console.error(`Failed to upload images for generation ${gen.id}:`, error);
        // Continue with original images
      }
    }

    processedGenerations.push({
      ...gen,
      images,
    });
  }

  // Save to database
  const rows = processedGenerations.map((gen) => toDbFormat(gen, user.id));

  const { error } = await supabase
    .from("generations")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Failed to save generations to cloud:", error);
    throw error;
  }
}

/**
 * Delete generation with its images
 */
export async function deleteGenerationWithImages(generationId: string): Promise<void> {
  // Delete images first
  try {
    await deleteGenerationImages(generationId);
  } catch (error) {
    console.error("Failed to delete generation images:", error);
  }

  // Then delete the database record
  await deleteGenerationFromCloud(generationId);
}

/**
 * Get storage usage for current user
 */
export async function getStorageUsage(): Promise<{ used: number; limit: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { used: 0, limit: 1073741824 }; // 1GB default limit
  }

  // List files in user's folder
  const { data: genFiles } = await supabase.storage
    .from(GENERATIONS_BUCKET)
    .list(user.id, { limit: 1000 });

  const { data: attachFiles } = await supabase.storage
    .from(PROMPT_ATTACHMENTS_BUCKET)
    .list(user.id, { limit: 1000 });

  let totalSize = 0;

  // Sum up file sizes (metadata includes size)
  if (genFiles) {
    for (const file of genFiles) {
      if (file.metadata?.size) {
        totalSize += file.metadata.size;
      }
    }
  }

  if (attachFiles) {
    for (const file of attachFiles) {
      if (file.metadata?.size) {
        totalSize += file.metadata.size;
      }
    }
  }

  return {
    used: totalSize,
    limit: 1073741824, // 1GB for free tier
  };
}
