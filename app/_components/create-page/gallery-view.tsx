"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { MagnifyingGlassIcon, HeartIcon, HeartFilledIcon } from "./icons";
import { QuickActionsOverlay } from "./quick-actions-overlay";
import type { Generation } from "./types";

type GalleryViewProps = {
  generations: Generation[];
  onExpand: (generationId: string, imageIndex: number) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (generationId: string, imageIndex: number) => void;
  onUsePrompt?: (prompt: string, inputImages: Generation["inputImages"]) => void;
};

export function GalleryView({
  generations,
  onExpand,
  favorites = new Set(),
  onToggleFavorite,
  onUsePrompt,
}: GalleryViewProps) {
  const [search, setSearch] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Flatten all images into a single list for the grid
  const allImages = useMemo(() => {
    return generations.flatMap((gen) =>
      gen.images.map((src, index) => ({
        id: gen.id,
        index,
        src,
        prompt: gen.prompt,
        aspect: gen.aspect,
        createdAt: gen.createdAt,
        inputImages: gen.inputImages || [],
      }))
    );
  }, [generations]);

  // Filter based on search and favorites
  const filteredImages = useMemo(() => {
    let filtered = allImages;

    // Filter by favorites if enabled
    if (showFavoritesOnly) {
      filtered = filtered.filter((img) => {
        const favoriteId = `${img.id}:${img.index}`;
        return favorites.has(favoriteId);
      });
    }

    // Filter by search
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((img) => img.prompt.toLowerCase().includes(lowerSearch));
    }

    return filtered;
  }, [allImages, search, showFavoritesOnly, favorites]);

  const favoritesCount = useMemo(() => {
    return allImages.filter((img) => favorites.has(`${img.id}:${img.index}`)).length;
  }, [allImages, favorites]);

  const handleCopyPrompt = useCallback(async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch (error) {
      console.error("Failed to copy prompt", error);
    }
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 max-w-2xl mx-auto w-full">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <MagnifyingGlassIcon className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your creations..."
            className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
          />
        </div>

        {/* Favorites Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFavoritesOnly((prev) => !prev)}
          className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold border transition-all ${
            showFavoritesOnly
              ? "bg-[#ff4757] border-[#ff4757] text-white"
              : "bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)]"
          }`}
          title={showFavoritesOnly ? "Show all images" : "Show favorites only"}
        >
          {showFavoritesOnly ? (
            <HeartFilledIcon className="h-4 w-4" />
          ) : (
            <HeartIcon className="h-4 w-4" />
          )}
          <span>Favorites</span>
          {favoritesCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${showFavoritesOnly ? "bg-white/20" : "bg-[var(--bg-subtle)]"}`}>
              {favoritesCount}
            </span>
          )}
        </button>
      </div>

      {/* Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
          {filteredImages.map((item) => {
            const itemKey = `${item.id}-${item.index}`;
            const favoriteId = `${item.id}:${item.index}`;
            const isFavorite = favorites.has(favoriteId);
            const isHovered = hoveredItem === itemKey;

            return (
              <button
                key={itemKey}
                type="button"
                onClick={() => onExpand(item.id, item.index)}
                onMouseEnter={() => setHoveredItem(itemKey)}
                onMouseLeave={() => setHoveredItem(null)}
                className="group relative aspect-square w-full overflow-hidden bg-[var(--bg-subtle)] focus:outline-none"
              >
                <Image
                  src={item.src}
                  alt={item.prompt}
                  width={512}
                  height={512}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  unoptimized
                />
                {/* Favorite Badge */}
                {isFavorite && (
                  <div className="absolute top-2 right-2 z-10">
                    <HeartFilledIcon className="h-5 w-5 text-[#ff4757] drop-shadow-lg" />
                  </div>
                )}
                {/* Quick Actions Overlay */}
                {onToggleFavorite && (
                  <QuickActionsOverlay
                    isFavorite={isFavorite}
                    onToggleFavorite={() => onToggleFavorite(item.id, item.index)}
                    onCopyPrompt={() => handleCopyPrompt(item.prompt)}
                    onReuse={onUsePrompt ? () => onUsePrompt(item.prompt, item.inputImages) : undefined}
                    visible={isHovered}
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)]">
          {showFavoritesOnly ? (
            <>
              <HeartIcon className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No favorites yet</p>
              <p className="text-sm">Click the heart icon on images to add them to your favorites.</p>
              <button
                type="button"
                onClick={() => setShowFavoritesOnly(false)}
                className="mt-4 text-sm text-[var(--accent-primary)] hover:underline"
              >
                Show all images
              </button>
            </>
          ) : (
            <p>No images found.</p>
          )}
        </div>
      )}
    </div>
  );
}
