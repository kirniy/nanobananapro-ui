"use client";

import { vpsApi } from "../vps-api/client";
import type { Generation } from "../../_components/create-page/types";
import type { Generation as VpsGeneration, CreateGenerationInput } from "../vps-api/client";

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || "http://46.203.233.138/api";

/**
 * Convert app Generation type to API format
 */
function toApiFormat(generation: Generation): CreateGenerationInput {
  return {
    id: generation.id,
    prompt: generation.prompt,
    aspect: generation.aspect,
    quality: generation.quality,
    output_format: generation.outputFormat,
    provider: generation.provider,
    size_width: generation.size.width,
    size_height: generation.size.height,
    images: generation.images,
    input_images: generation.inputImages,
    created_at: generation.createdAt,
  };
}

/**
 * Convert API format to app Generation type
 */
function fromApiFormat(row: VpsGeneration): Generation {
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
 * Check if user is authenticated (via VPS API token being set)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await vpsApi.health();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user ID - returns null as we don't track this client-side anymore
 * The VPS API uses the token to identify the user
 */
export async function getCurrentUserId(): Promise<string | null> {
  // User ID is embedded in the API token, not exposed client-side
  return null;
}

/**
 * Save generations to VPS
 */
export async function saveGenerationsToCloud(generations: Generation[]): Promise<void> {
  const apiGenerations = generations.map(toApiFormat);
  await vpsApi.bulkUpsertGenerations(apiGenerations);
}

/**
 * Load generations from VPS
 */
export async function loadGenerationsFromCloud(): Promise<Generation[]> {
  try {
    const data = await vpsApi.getGenerations();
    return data.map(fromApiFormat);
  } catch (error) {
    console.error("Failed to load generations from cloud:", error);
    return [];
  }
}

/**
 * Delete a generation from VPS
 */
export async function deleteGenerationFromCloud(generationId: string): Promise<void> {
  await vpsApi.deleteGeneration(generationId);
}

/**
 * Save favorites to VPS
 */
export async function saveFavoritesToCloud(favorites: Set<string>): Promise<void> {
  const favArray = Array.from(favorites).map((fav) => {
    const [generationId, imageIndex] = fav.split(":");
    return {
      generation_id: generationId,
      image_index: parseInt(imageIndex, 10),
    };
  });

  if (favArray.length > 0) {
    await vpsApi.bulkUpsertFavorites(favArray);
  }
}

/**
 * Load favorites from VPS
 */
export async function loadFavoritesFromCloud(): Promise<Set<string>> {
  try {
    const data = await vpsApi.getFavorites();
    const favorites = new Set<string>();
    data.forEach((row) => {
      favorites.add(`${row.generation_id}:${row.image_index}`);
    });
    return favorites;
  } catch (error) {
    console.error("Failed to load favorites from cloud:", error);
    return new Set();
  }
}

/**
 * Toggle a favorite in VPS
 */
export async function toggleFavoriteInCloud(generationId: string, imageIndex: number): Promise<boolean> {
  // Get current favorites
  const favorites = await vpsApi.getFavorites();
  const existing = favorites.find(
    (f) => f.generation_id === generationId && f.image_index === imageIndex
  );

  if (existing) {
    // Remove favorite
    await vpsApi.deleteFavorite(existing.id);
    return false;
  } else {
    // Add favorite
    await vpsApi.createFavorite(generationId, imageIndex);
    return true;
  }
}

/**
 * Save user settings to VPS
 */
export async function saveSettingsToCloud(settings: Record<string, unknown>): Promise<void> {
  await vpsApi.updateSettings(settings);
}

/**
 * Load user settings from VPS
 */
export async function loadSettingsFromCloud(): Promise<Record<string, unknown> | null> {
  try {
    const data = await vpsApi.getSettings();
    return (data?.settings as Record<string, unknown>) || null;
  } catch (error) {
    console.error("Failed to load settings from cloud:", error);
    return null;
  }
}

/**
 * Sync local data to cloud (for migration when user signs in)
 */
export async function syncLocalToCloud(
  generations: Generation[],
  favorites: Set<string>
): Promise<void> {
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
  try {
    const result = await vpsApi.getGenerationsCount();
    return result.count;
  } catch (error) {
    console.error("Failed to get generation count:", error);
    return 0;
  }
}

/**
 * Manually cleanup old generations (keeps favorites and most recent)
 * @param keepCount Number of recent generations to keep (default 100)
 * @returns Number of generations deleted
 */
export async function cleanupOldGenerations(keepCount: number = 100): Promise<number> {
  try {
    const result = await vpsApi.cleanupGenerations(keepCount);
    return result.deleted;
  } catch (error) {
    console.error("Failed to cleanup generations:", error);
    throw error;
  }
}

// ============================================
// API Key Management
// ============================================

export type ApiKeyType = "gemini" | "replicate" | "openai";

interface ApiKeyInfo {
  hasKey: boolean;
  hint: string | null;
}

/**
 * Save an API key
 */
export async function saveApiKey(keyType: ApiKeyType, apiKey: string): Promise<void> {
  const keyName = `${keyType}_key` as "gemini_key" | "replicate_key" | "openai_key";
  await vpsApi.updateApiKeys({ [keyName]: apiKey });
}

/**
 * Get API key from storage
 */
export async function getApiKey(keyType: ApiKeyType): Promise<string | null> {
  try {
    const data = await vpsApi.getFullApiKeys();
    const keyMap: Record<string, string | null | undefined> = {
      gemini: data.gemini_key,
      replicate: data.replicate_key,
      openai: data.openai_key,
    };
    return keyMap[keyType] || null;
  } catch (error) {
    console.error(`Failed to get ${keyType} API key:`, error);
    return null;
  }
}

/**
 * Get API key info (whether it exists and hint)
 */
export async function getApiKeyInfo(keyType: ApiKeyType): Promise<ApiKeyInfo> {
  try {
    const data = await vpsApi.getApiKeys();
    const infoMap: Record<string, { hasKey: boolean; hint: string | null }> = {
      gemini: { hasKey: data.has_gemini || false, hint: data.gemini_hint || null },
      replicate: { hasKey: data.has_replicate || false, hint: data.replicate_hint || null },
      openai: { hasKey: data.has_openai || false, hint: data.openai_hint || null },
    };
    return infoMap[keyType];
  } catch (error) {
    console.error(`Failed to get ${keyType} API key info:`, error);
    return { hasKey: false, hint: null };
  }
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyType: ApiKeyType): Promise<void> {
  // Update with null value to delete
  const keyName = `${keyType}_key` as "gemini_key" | "replicate_key" | "openai_key";
  await vpsApi.updateApiKeys({ [keyName]: null });
}

/**
 * Get all API key infos at once
 */
export async function getAllApiKeyInfos(): Promise<Record<ApiKeyType, ApiKeyInfo>> {
  const defaultResult: Record<ApiKeyType, ApiKeyInfo> = {
    gemini: { hasKey: false, hint: null },
    replicate: { hasKey: false, hint: null },
    openai: { hasKey: false, hint: null },
  };

  try {
    const data = await vpsApi.getApiKeys();
    return {
      gemini: { hasKey: data.has_gemini || false, hint: data.gemini_hint || null },
      replicate: { hasKey: data.has_replicate || false, hint: data.replicate_hint || null },
      openai: { hasKey: data.has_openai || false, hint: data.openai_hint || null },
    };
  } catch (error) {
    console.error("Failed to get API key infos:", error);
    return defaultResult;
  }
}

// ============================================
// Image Storage Functions
// ============================================

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
 * Check if image needs to be uploaded (is local data, not already a VPS URL)
 */
function needsUpload(imageUrl: string): boolean {
  // Already a VPS storage URL
  if (imageUrl.includes(VPS_API_URL.replace("/api", "")) && imageUrl.includes("/storage/")) {
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
  // External URL - keep as-is
  return false;
}

/**
 * Convert blob URL to base64 data URL
 */
async function blobUrlToBase64(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload a single image to VPS Storage
 */
export async function uploadImage(
  imageData: string | Blob,
  _bucket: string,
  _path: string
): Promise<string> {
  let dataUrl: string;

  if (typeof imageData === "string") {
    if (isBase64DataUrl(imageData)) {
      dataUrl = imageData;
    } else if (isBlobUrl(imageData)) {
      dataUrl = await blobUrlToBase64(imageData);
    } else {
      throw new Error("Invalid image data: expected base64 data URL or blob URL");
    }
  } else {
    // Convert Blob to base64
    dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageData);
    });
  }

  const result = await vpsApi.uploadBase64(dataUrl);
  return vpsApi.getStorageUrl(result.url);
}

/**
 * Upload generation images to VPS Storage
 */
export async function uploadGenerationImages(
  generationId: string,
  images: string[]
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i];

    if (!imageUrl || imageUrl.trim() === "") {
      uploadedUrls.push(imageUrl);
      continue;
    }

    if (needsUpload(imageUrl)) {
      try {
        const path = `${generationId}/${i}`;
        const newUrl = await uploadImage(imageUrl, "generations", path);
        uploadedUrls.push(newUrl);
        console.log(`Uploaded image ${i} for generation ${generationId}`);
      } catch (error) {
        console.error(`Failed to upload image ${i}:`, error);
        uploadedUrls.push(imageUrl);
      }
    } else {
      uploadedUrls.push(imageUrl);
    }
  }

  return uploadedUrls;
}

/**
 * Upload prompt attachment to VPS Storage
 */
export async function uploadPromptAttachment(
  promptId: string,
  imageData: string,
  index: number
): Promise<string> {
  const path = `${promptId}/${index}`;
  return uploadImage(imageData, "prompt-attachments", path);
}

/**
 * Delete generation images from VPS Storage
 * Note: VPS storage deletion is handled automatically when generation is deleted
 */
export async function deleteGenerationImages(_generationId: string): Promise<void> {
  // Storage cleanup is handled server-side
  // This function is kept for API compatibility
}

/**
 * Save generations with image upload
 */
export async function saveGenerationsWithImages(
  generations: Generation[],
  uploadImagesFlag: boolean = true
): Promise<void> {
  const processedGenerations: Generation[] = [];

  for (const gen of generations) {
    let images = gen.images;

    if (uploadImagesFlag && images.some((img) => isBase64DataUrl(img) || isBlobUrl(img))) {
      try {
        images = await uploadGenerationImages(gen.id, images);
      } catch (error) {
        console.error(`Failed to upload images for generation ${gen.id}:`, error);
      }
    }

    processedGenerations.push({
      ...gen,
      images,
    });
  }

  await saveGenerationsToCloud(processedGenerations);
}

/**
 * Delete generation with its images
 */
export async function deleteGenerationWithImages(generationId: string): Promise<void> {
  await deleteGenerationImages(generationId);
  await deleteGenerationFromCloud(generationId);
}

/**
 * Get storage usage for current user
 */
export async function getStorageUsage(): Promise<{ used: number; limit: number }> {
  // VPS doesn't have a limit concept - return a large value
  return {
    used: 0,
    limit: 10737418240, // 10GB
  };
}
