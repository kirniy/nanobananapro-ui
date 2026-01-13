"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/auth-context";
import {
  saveGenerationsWithImages,
  loadGenerationsFromCloud,
  deleteGenerationWithImages,
  saveFavoritesToCloud,
  loadFavoritesFromCloud,
  loadSettingsFromCloud,
  saveSettingsToCloud,
} from "@/app/lib/supabase/cloud-storage";
import type { Generation } from "./types";

type UseCloudSyncOptions = {
  generations: Generation[];
  favorites: Set<string>;
  onGenerationsLoaded: (generations: Generation[]) => void;
  onFavoritesLoaded: (favorites: Set<string>) => void;
};

const SYNC_IMAGES_KEY = "nano-banana-sync-images";

/**
 * Hook to sync generations and favorites with cloud (VPS) when user is authenticated
 */
export function useCloudSync({
  generations,
  favorites,
  onGenerationsLoaded,
  onFavoritesLoaded,
}: UseCloudSyncOptions) {
  const { user } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const syncInProgressRef = useRef(false);
  const initialSyncDoneRef = useRef(false);
  const lastSyncedGenerationsRef = useRef<string>("");
  const lastSyncedFavoritesRef = useRef<string>("");

  // Image sync setting (default: true)
  const [syncImages, setSyncImages] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SYNC_IMAGES_KEY);
    return stored !== null ? stored === "true" : true;
  });

  // Persist sync images setting
  const handleSetSyncImages = useCallback((value: boolean) => {
    setSyncImages(value);
    localStorage.setItem(SYNC_IMAGES_KEY, String(value));
  }, []);

  // Load data from cloud AND upload local data when user signs in
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = prevUserIdRef.current;

    // User just signed in
    if (currentUserId && !previousUserId && !initialSyncDoneRef.current) {
      const syncWithCloud = async () => {
        syncInProgressRef.current = true;
        try {
          // Load cloud settings to get sync preference
          const cloudSettings = await loadSettingsFromCloud();
          if (cloudSettings?.syncImages !== undefined) {
            handleSetSyncImages(cloudSettings.syncImages as boolean);
          }

          // First, load what's in the cloud
          const [cloudGenerations, cloudFavorites] = await Promise.all([
            loadGenerationsFromCloud(),
            loadFavoritesFromCloud(),
          ]);

          // Get IDs of what's already in cloud
          const cloudGenIds = new Set(cloudGenerations.map(g => g.id));
          const cloudFavIds = cloudFavorites;

          // Find local items that aren't in cloud yet
          const localOnlyGenerations = generations.filter(g => !cloudGenIds.has(g.id));
          const localOnlyFavorites = new Set(
            Array.from(favorites).filter(f => !cloudFavIds.has(f))
          );

          // Upload local-only items to cloud (with images if enabled)
          if (localOnlyGenerations.length > 0) {
            console.log(`Uploading ${localOnlyGenerations.length} local generations to cloud${syncImages ? " with images" : ""}...`);
            await saveGenerationsWithImages(localOnlyGenerations, syncImages);
          }

          if (localOnlyFavorites.size > 0) {
            console.log(`Uploading ${localOnlyFavorites.size} local favorites to cloud...`);
            // Merge and save all favorites
            const mergedFavorites = new Set([...cloudFavorites, ...favorites]);
            await saveFavoritesToCloud(mergedFavorites);
          }

          // Only load cloud data that doesn't exist locally
          // Local data is the source of truth - cloud is just for backup/sync
          // Only add items from cloud that we don't have locally (e.g., from another device)
          const localIds = new Set(generations.map(g => g.id));
          const cloudOnlyGenerations = cloudGenerations.filter(g => !localIds.has(g.id));

          if (cloudOnlyGenerations.length > 0) {
            onGenerationsLoaded(cloudOnlyGenerations);
          }

          // Merge favorites (additive only)
          if (cloudFavorites.size > 0) {
            onFavoritesLoaded(cloudFavorites);
          }

          // Update sync refs to prevent re-uploading
          const allGenerationIds = [...new Set([...cloudGenerations.map(g => g.id), ...generations.map(g => g.id)])];
          lastSyncedGenerationsRef.current = JSON.stringify(allGenerationIds.sort());

          const allFavoriteIds = [...new Set([...cloudFavorites, ...favorites])];
          lastSyncedFavoritesRef.current = JSON.stringify(allFavoriteIds.sort());

          initialSyncDoneRef.current = true;
          console.log("Cloud sync complete!");
        } catch (error) {
          console.error("Failed to sync with cloud:", error);
        } finally {
          syncInProgressRef.current = false;
        }
      };

      syncWithCloud();
    }

    // User signed out - reset initial sync flag
    if (!currentUserId && previousUserId) {
      initialSyncDoneRef.current = false;
      lastSyncedGenerationsRef.current = "";
      lastSyncedFavoritesRef.current = "";
    }

    prevUserIdRef.current = currentUserId;
  }, [user, generations, favorites, onGenerationsLoaded, onFavoritesLoaded, syncImages, handleSetSyncImages]);

  // Sync generations to cloud when they change (after initial sync)
  useEffect(() => {
    if (!user || syncInProgressRef.current || !initialSyncDoneRef.current) return;

    const currentGenerationsKey = JSON.stringify(generations.map(g => g.id).sort());
    if (currentGenerationsKey === lastSyncedGenerationsRef.current) return;

    const syncGenerations = async () => {
      syncInProgressRef.current = true;
      try {
        // Find new generations (ones not in last synced set)
        const lastSyncedIds = new Set(JSON.parse(lastSyncedGenerationsRef.current || "[]"));
        const newGenerations = generations.filter(g => !lastSyncedIds.has(g.id));

        if (newGenerations.length > 0) {
          // Upload new generations with images (if enabled)
          // Local data remains source of truth - we only upload, never replace local state
          await saveGenerationsWithImages(newGenerations, syncImages);
        }

        lastSyncedGenerationsRef.current = currentGenerationsKey;
      } catch (error) {
        console.error("Failed to sync generations to cloud:", error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    // Debounce sync
    const timeoutId = setTimeout(syncGenerations, 2000);
    return () => clearTimeout(timeoutId);
  }, [user, generations, syncImages]);

  // Sync favorites to cloud when they change (after initial sync)
  useEffect(() => {
    if (!user || !initialSyncDoneRef.current) return;

    const currentFavoritesKey = JSON.stringify(Array.from(favorites).sort());
    if (currentFavoritesKey === lastSyncedFavoritesRef.current) return;

    const syncFavorites = async () => {
      try {
        await saveFavoritesToCloud(favorites);
        lastSyncedFavoritesRef.current = currentFavoritesKey;
      } catch (error) {
        console.error("Failed to sync favorites to cloud:", error);
      }
    };

    // Debounce sync
    const timeoutId = setTimeout(syncFavorites, 1000);
    return () => clearTimeout(timeoutId);
  }, [user, favorites]);

  // Save sync images setting to cloud when it changes
  useEffect(() => {
    if (!user || !initialSyncDoneRef.current) return;

    const saveSyncSetting = async () => {
      try {
        await saveSettingsToCloud({ syncImages });
      } catch (error) {
        console.error("Failed to save sync setting:", error);
      }
    };

    saveSyncSetting();
  }, [user, syncImages]);

  // Delete from cloud
  const deleteFromCloud = useCallback(async (generationId: string) => {
    if (!user) return;

    try {
      await deleteGenerationWithImages(generationId);
    } catch (error) {
      console.error("Failed to delete from cloud:", error);
    }
  }, [user]);

  return {
    isCloudEnabled: !!user,
    syncImages,
    setSyncImages: handleSetSyncImages,
    deleteFromCloud,
  };
}
