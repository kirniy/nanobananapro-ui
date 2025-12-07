import Image from "next/image";
import { memo, useState, useCallback } from "react";

import { type AspectKey } from "../../lib/seedream-options";
import { GenerationDetailsCard } from "./generation-details-card";
import { debugLog } from "./logger";
import { HeartIcon, HeartFilledIcon, CopyIcon, CheckIcon, RefreshIcon } from "./icons";
import type { Generation } from "./types";

type GenerationGroupProps = {
  label: string;
  generations: Generation[];
  pendingIdSet: Set<string>;
  errorGenerationId: string | null;
  errorMessage: string | null;
  onExpand: (generationId: string, imageIndex: number) => void;
  onUsePrompt: (prompt: string, inputImages: Generation["inputImages"]) => void;
  onPreviewInputImage?: (image: Generation["inputImages"][number]) => void;
  onDeleteGeneration: (generationId: string) => void;
  onRetryGeneration?: (generationId: string) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (generationId: string, imageIndex: number) => void;
};

export const GenerationGroup = memo(function GenerationGroup({
  label,
  generations,
  pendingIdSet,
  errorGenerationId,
  errorMessage,
  onExpand,
  onUsePrompt,
  onPreviewInputImage,
  onDeleteGeneration,
  onRetryGeneration,
  favorites = new Set(),
  onToggleFavorite,
}: GenerationGroupProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-text-muted pl-1">
        {label}
      </h2>
      <div className="space-y-10">
        {generations.map((generation) => {
          const isGenerating = pendingIdSet.has(generation.id);
          const isInterrupted = !isGenerating && generation.images.some((img) => !img);
          const cardError = generation.id === errorGenerationId ? errorMessage : null;

          return (
            <div
              key={generation.id}
              className="flex flex-col gap-6 lg:flex-row lg:items-start group"
            >
              <div className="w-full lg:flex-1 lg:min-w-0">
                <GenerationGallery
                  generation={generation}
                  onExpand={onExpand}
                  isInterrupted={isInterrupted}
                  isGenerating={isGenerating}
                  favorites={favorites}
                  onToggleFavorite={onToggleFavorite}
                  onUsePrompt={onUsePrompt}
                />
              </div>
              <div className="w-full max-w-[180px] lg:w-44 lg:basis-44 lg:flex-none lg:self-start lg:shrink-0 transition-opacity duration-300 lg:opacity-80 lg:group-hover:opacity-100">
                <GenerationDetailsCard
                  generation={generation}
                  isGenerating={isGenerating}
                  errorMessage={cardError}
                  onUsePrompt={onUsePrompt}
                  onPreviewInputImage={onPreviewInputImage}
                  onDeleteGeneration={onDeleteGeneration}
                  canDelete={!isGenerating}
                  onRetry={onRetryGeneration ? () => onRetryGeneration(generation.id) : undefined}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

type GenerationGalleryProps = {
  generation: Generation;
  onExpand: (generationId: string, imageIndex: number) => void;
  isInterrupted: boolean;
  isGenerating: boolean;
  favorites?: Set<string>;
  onToggleFavorite?: (generationId: string, imageIndex: number) => void;
  onUsePrompt?: (prompt: string, inputImages: Generation["inputImages"]) => void;
};

const GenerationGallery = memo(function GenerationGallery({
  generation,
  onExpand,
  isInterrupted,
  isGenerating,
  favorites = new Set(),
  onToggleFavorite,
  onUsePrompt,
}: GenerationGalleryProps) {
  const layout = resolveGalleryLayout(generation);

  debugLog("gallery:render", {
    generationId: generation.id,
    aspect: generation.aspect,
    imageCount: generation.images.length,
    tileClass: layout.tileClass,
    gridClass: layout.gridClass,
    layoutSource: layout.source,
    ratio: layout.ratio,
    size: generation.size,
  });

  return (
    <article className="w-full rounded-3xl p-1 bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,215,0,0.1)] hover:border-[var(--border-highlight)]">
      <div className={`${layout.gridClass} overflow-hidden rounded-[20px] bg-[var(--bg-app)]`}>
        {generation.images.map((src, index) => (
          <ImageTile
            key={`${generation.id}-${index}`}
            src={src}
            className={layout.tileClass}
            prompt={generation.prompt}
            onExpand={() => onExpand(generation.id, index)}
            generationId={generation.id}
            imageIndex={index}
            size={generation.size}
            isInterrupted={isInterrupted}
            isGenerating={isGenerating}
            isFavorite={favorites.has(`${generation.id}:${index}`)}
            onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(generation.id, index) : undefined}
            onCopyPrompt={() => navigator.clipboard.writeText(generation.prompt)}
            onReuse={onUsePrompt ? () => onUsePrompt(generation.prompt, generation.inputImages || []) : undefined}
          />
        ))}
      </div>
    </article>
  );
});

type ImageTileProps = {
  src: string;
  className: string;
  prompt: string;
  onExpand: () => void;
  generationId: string;
  imageIndex: number;
  size: { width: number; height: number };
  isInterrupted: boolean;
  isGenerating: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onCopyPrompt?: () => void;
  onReuse?: () => void;
};

const ImageTile = memo(function ImageTile({
  src,
  className,
  prompt,
  onExpand,
  generationId,
  imageIndex,
  size,
  isInterrupted,
  isGenerating,
  isFavorite = false,
  onToggleFavorite,
  onCopyPrompt,
  onReuse,
}: ImageTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  const handleCopyPrompt = useCallback(() => {
    onCopyPrompt?.();
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  }, [onCopyPrompt]);

  const handleFavoriteClick = useCallback(() => {
    if (!isFavorite) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 400);
    }
    onToggleFavorite?.();
  }, [onToggleFavorite, isFavorite]);

  const width = Math.max(size?.width ?? 1024, 256);
  const height = Math.max(size?.height ?? 1024, 256);
  const maxDimension = Math.max(width, height);
  const devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const desiredPixelWidth = Math.max(
    width,
    height,
    Math.ceil(Math.max(width, height) * devicePixelRatio),
  );

  const shouldBypassOptimization = false;

  if (!src) {
    const interruptedStyles = isInterrupted
      ? "bg-[var(--bg-input)] border border-[var(--color-error)]/40 text-[var(--color-error)]"
      : "animate-pulse bg-[var(--bg-input)] border border-[var(--border-subtle)]";

    return (
      <div className={`${className} relative ${interruptedStyles}`}>
        {isInterrupted ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>Interrupted</span>
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">
            {isGenerating ? "Generating..." : "Loading"}
          </div>
        )}
      </div>
    );
  }

  const handleTileClick = useCallback((e: React.MouseEvent) => {
    // Only expand if we clicked on the image itself, not on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('[data-action-bar]')) {
      return;
    }
    onExpand();
  }, [onExpand]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTileClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onExpand(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${className} relative bg-[var(--bg-app)] transition-all duration-300 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 cursor-pointer overflow-hidden group/tile`}
      aria-label="Expand image"
    >
      <Image
        src={src}
        alt={prompt}
        width={width}
        height={height}
        draggable={false}
        sizes="(max-width: 640px) calc((100vw - 2.5rem) / 2), (max-width: 1024px) calc((100vw - 4rem) / 2), calc((min(1400px, 100vw) - 4rem) / 4)"
        unoptimized={shouldBypassOptimization}
        loading={shouldBypassOptimization ? "eager" : "lazy"}
        className="h-full w-full object-cover select-none transition-transform duration-500 group-hover/tile:scale-105"
        onLoad={({ currentTarget }) => {
          debugLog("gallery:image-loaded", {
            generationId,
            imageIndex,
            naturalWidth: currentTarget.naturalWidth,
            naturalHeight: currentTarget.naturalHeight,
            renderedWidth: currentTarget.width,
            renderedHeight: currentTarget.height,
            devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : null,
            requestedWidth: width,
            requestedHeight: height,
            desiredPixelWidth,
            maxDimension,
            shouldBypassOptimization,
          });
        }}
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          filter: devicePixelRatio > 1 ? "none" : undefined,
        }}
      />
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover/tile:bg-black/10 pointer-events-none" />

      {/* Favorite Badge - Always visible when favorited */}
      {isFavorite && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <HeartFilledIcon className="h-5 w-5 text-[#ff4757] drop-shadow-lg" />
        </div>
      )}

      {/* Quick Actions Overlay */}
      {onToggleFavorite && (
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
          {/* Gradient overlay for visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* Action buttons */}
          <div data-action-bar className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 pointer-events-auto">
            {/* Favorite Button */}
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${isFavorite ? "text-[#ff4757]" : "text-white/80 hover:text-white hover:bg-white/15"} ${heartBurst ? "animate-heart-pop" : ""}`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite ? <HeartFilledIcon className="h-4 w-4" /> : <HeartIcon className="h-4 w-4" />}
            </button>

            {/* Copy Prompt Button */}
            {onCopyPrompt && (
              <button
                type="button"
                onClick={handleCopyPrompt}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${copiedPrompt ? "text-[var(--color-success)]" : "text-white/80 hover:text-white hover:bg-white/15"}`}
                title="Copy prompt"
              >
                {copiedPrompt ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              </button>
            )}

            {/* Reuse Prompt Button */}
            {onReuse && (
              <button
                type="button"
                onClick={onReuse}
                className="flex items-center justify-center w-8 h-8 rounded-md text-white/80 hover:text-white hover:bg-white/15 transition-all"
                title="Reuse this prompt"
              >
                <RefreshIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const GRID_CLASS_MAP: Record<AspectKey, string> = {
  "square-1-1": "grid grid-cols-2 gap-0.5",
  "portrait-2-3": "grid grid-cols-2 gap-0.5",
  "portrait-3-4": "grid grid-cols-2 gap-0.5",
  "portrait-4-5": "grid grid-cols-2 gap-0.5",
  "portrait-9-16": "grid grid-cols-2 gap-0.5",
  "landscape-3-2": "grid grid-cols-2 gap-0.5",
  "landscape-4-3": "grid grid-cols-2 gap-0.5",
  "landscape-5-4": "grid grid-cols-2 gap-0.5",
  "landscape-16-9": "grid grid-cols-2 gap-0.5",
  "landscape-21-9": "grid grid-cols-2 gap-0.5",
};

const TILE_CLASS_MAP: Record<AspectKey, string> = {
  "square-1-1": "relative aspect-square overflow-hidden",
  "portrait-2-3": "relative aspect-[2/3] overflow-hidden",
  "portrait-3-4": "relative aspect-[3/4] overflow-hidden",
  "portrait-4-5": "relative aspect-[4/5] overflow-hidden",
  "portrait-9-16": "relative aspect-[9/16] overflow-hidden",
  "landscape-3-2": "relative aspect-[3/2] overflow-hidden",
  "landscape-4-3": "relative aspect-[4/3] overflow-hidden",
  "landscape-5-4": "relative aspect-[5/4] overflow-hidden",
  "landscape-16-9": "relative aspect-[16/9] overflow-hidden",
  "landscape-21-9": "relative aspect-[21/9] overflow-hidden",
};

const DEFAULT_GRID_CLASS = "grid grid-cols-2 gap-0.5";
const DEFAULT_TILE_CLASS = "relative aspect-square overflow-hidden";

type GalleryLayout = {
  gridClass: string;
  tileClass: string;
  source: "preset" | "custom";
  ratio: number | null;
};

function resolveGalleryLayout(generation: Generation): GalleryLayout {
  if (generation.aspect !== "custom") {
    return {
      gridClass: GRID_CLASS_MAP[generation.aspect],
      tileClass: TILE_CLASS_MAP[generation.aspect],
      source: "preset",
      ratio: null,
    };
  }

  const width = Number(generation.size?.width ?? 0);
  const height = Number(generation.size?.height ?? 0);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      gridClass: DEFAULT_GRID_CLASS,
      tileClass: DEFAULT_TILE_CLASS,
      source: "custom",
      ratio: null,
    };
  }

  const ratio = width / height;

  if (!Number.isFinite(ratio) || ratio <= 0) {
    return {
      gridClass: DEFAULT_GRID_CLASS,
      tileClass: DEFAULT_TILE_CLASS,
      source: "custom",
      ratio: null,
    };
  }

  if (ratio >= 2.2) {
    return {
      gridClass: DEFAULT_GRID_CLASS,
      tileClass: "relative aspect-[21/9] overflow-hidden",
      source: "custom",
      ratio,
    };
  }

  if (ratio >= 1.7) {
    return {
      gridClass: DEFAULT_GRID_CLASS,
      tileClass: "relative aspect-[16/9] overflow-hidden",
      source: "custom",
      ratio,
    };
  }

  if (ratio >= 1.3) {
    return {
      gridClass: DEFAULT_GRID_CLASS,
      tileClass: "relative aspect-[3/2] overflow-hidden",
      source: "custom",
      ratio,
    };
  }

  if (ratio >= 0.9) {
    return {
      gridClass: DEFAULT_GRID_CLASS,
      tileClass: "relative aspect-square overflow-hidden",
      source: "custom",
      ratio,
    };
  }

  if (ratio >= 0.7) {
    return {
      gridClass: DEFAULT_GRID_CLASS,
      tileClass: "relative aspect-[4/5] overflow-hidden",
      source: "custom",
      ratio,
    };
  }

  return {
    gridClass: DEFAULT_GRID_CLASS,
    tileClass: "relative aspect-[9/16] overflow-hidden",
    source: "custom",
    ratio,
  };
}
