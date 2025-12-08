"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/auth-context";
import {
  saveGenerationsToCloud,
  loadGenerationsFromCloud,
  deleteGenerationFromCloud,
  saveFavoritesToCloud,
  loadFavoritesFromCloud,
} from "@/app/lib/supabase/cloud-storage";
import type { Generation } from "./types";

type UseCloudSyncOptions = {
  generations: Generation[];
  favorites: Set<string>;
  onGenerationsLoaded: (generations: Generation[]) => void;
  onFavoritesLoaded: (favorites: Set<string>) => void;
};

/**
 * Hook to sync generations and favorites with Supabase when user is authenticated
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
  const lastSyncedGenerationsRef = useRef<string>("");
  const lastSyncedFavoritesRef = useRef<string>("");

  // Load data from cloud when user signs in
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = prevUserIdRef.current;

    // User just signed in
    if (currentUserId && !previousUserId) {
      const loadFromCloud = async () => {
        try {
          const [cloudGenerations, cloudFavorites] = await Promise.all([
            loadGenerationsFromCloud(),
            loadFavoritesFromCloud(),
          ]);

          if (cloudGenerations.length > 0) {
            onGenerationsLoaded(cloudGenerations);
            lastSyncedGenerationsRef.current = JSON.stringify(cloudGenerations.map(g => g.id).sort());
          }

          if (cloudFavorites.size > 0) {
            onFavoritesLoaded(cloudFavorites);
            lastSyncedFavoritesRef.current = JSON.stringify(Array.from(cloudFavorites).sort());
          }
        } catch (error) {
          console.error("Failed to load data from cloud:", error);
        }
      };

      loadFromCloud();
    }

    prevUserIdRef.current = currentUserId;
  }, [user, onGenerationsLoaded, onFavoritesLoaded]);

  // Sync generations to cloud when they change
  useEffect(() => {
    if (!user || syncInProgressRef.current) return;

    const currentGenerationsKey = JSON.stringify(generations.map(g => g.id).sort());
    if (currentGenerationsKey === lastSyncedGenerationsRef.current) return;

    const syncGenerations = async () => {
      syncInProgressRef.current = true;
      try {
        await saveGenerationsToCloud(generations);
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
  }, [user, generations]);

  // Sync favorites to cloud when they change
  useEffect(() => {
    if (!user) return;

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

  // Delete from cloud
  const deleteFromCloud = useCallback(async (generationId: string) => {
    if (!user) return;

    try {
      await deleteGenerationFromCloud(generationId);
    } catch (error) {
      console.error("Failed to delete from cloud:", error);
    }
  }, [user]);

  return {
    isCloudEnabled: !!user,
    deleteFromCloud,
  };
}
