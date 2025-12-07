import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WheelEvent } from "react";

import { getAspectDescription, getQualityLabel, type QualityKey } from "../../lib/seedream-options";
import { CompareSlider } from "./compare-slider";
import { ArrowLeftIcon, ArrowRightIcon, DownloadIcon, PlusIcon, SpinnerIcon, HeartIcon, HeartFilledIcon, CopyIcon, CheckIcon, UpscaleIcon, KeyboardIcon } from "./icons";
import type { GalleryEntry } from "./types";
import { generateSmartFilename } from "./utils";

// Upscale options based on current quality
const UPSCALE_OPTIONS: Record<QualityKey, QualityKey[]> = {
  "1k": ["2k", "4k"],
  "2k": ["4k"],
  "4k": [],
};

type LightboxProps = {
  entry: GalleryEntry;
  onClose: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  onEdit?: () => void;
  currentIndex?: number;
  totalCount?: number;
  // New props for Midjourney-style features
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onUpscale?: (targetQuality: QualityKey) => void;
  onShowShortcuts?: () => void;
  allEntries?: GalleryEntry[];
  onNavigateToEntry?: (entry: GalleryEntry) => void;
  favorites?: Set<string>;
};

export function Lightbox({
  entry,
  onClose,
  onDownload,
  isDownloading,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  onEdit,
  currentIndex = 0,
  totalCount = 1,
  isFavorite = false,
  onToggleFavorite,
  onUpscale,
  onShowShortcuts,
  allEntries = [],
  onNavigateToEntry,
  favorites = new Set(),
}: LightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailReelRef = useRef<HTMLDivElement>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedReferenceIndex, setSelectedReferenceIndex] = useState(0);
  const [compareSliderPosition, setCompareSliderPosition] = useState(50);
  const [isDownloadingComparison, setIsDownloadingComparison] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showUpscaleMenu, setShowUpscaleMenu] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showPromptExpanded, setShowPromptExpanded] = useState(false);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const hasReferences = entry.inputImages && entry.inputImages.length > 0;
  const zoomPercentage = Math.round(transform.scale * 100);
  const upscaleOptions = UPSCALE_OPTIONS[entry.quality as QualityKey] || [];
  const canUpscale = upscaleOptions.length > 0 && onUpscale;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(entry.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      console.error("Failed to copy prompt", error);
    }
  };

  const handleFavoriteClick = useCallback(() => {
    if (!onToggleFavorite) return;
    if (!isFavorite) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 400);
    }
    onToggleFavorite();
  }, [onToggleFavorite, isFavorite]);

  // Scroll thumbnail into view when current entry changes
  useEffect(() => {
    if (thumbnailReelRef.current && currentIndex >= 0) {
      const thumbnail = thumbnailReelRef.current.children[currentIndex] as HTMLElement;
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentIndex]);

  useEffect(() => {
    setIsCompareMode(false);
    setSelectedReferenceIndex(0);
    setCompareSliderPosition(50);
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [entry.generationId, entry.imageIndex]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    containerRef.current.focus();
  }, [entry.src]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "ArrowLeft" && canGoPrev) {
        event.preventDefault();
        onPrev();
      }

      if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        onNext();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (showUpscaleMenu) {
          setShowUpscaleMenu(false);
        } else {
          onClose();
        }
      }

      // L - Toggle favorite
      if (event.key === "l" || event.key === "L") {
        event.preventDefault();
        handleFavoriteClick();
      }

      // C - Copy prompt
      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        void handleCopyPrompt();
      }

      // D - Download
      if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        if (!isDownloading) {
          onDownload();
        }
      }

      // U - Toggle upscale menu
      if ((event.key === "u" || event.key === "U") && canUpscale) {
        event.preventDefault();
        setShowUpscaleMenu((prev) => !prev);
      }

      // ? - Show shortcuts panel
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        onShowShortcuts?.();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [onPrev, onNext, onClose, canGoPrev, canGoNext, handleFavoriteClick, isDownloading, onDownload, canUpscale, onShowShortcuts, showUpscaleMenu]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const scaleAmount = -event.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, transform.scale * (1 + scaleAmount)), 8);
    
    setTransform((prev) => ({
      ...prev,
      scale: newScale,
    }));
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    const isLeft = event.button === 0;
    const isRight = event.button === 2;

    // In compare mode, only allow pan with right click (button 2)
    // In normal mode, allow pan with left click (button 0)
    if (isCompareMode) {
      if (!isRight) return;
    } else {
      if (!isLeft) return;
    }

    event.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: event.clientX - transform.x, y: event.clientY - transform.y };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging.current) return;
    event.preventDefault();

    const nextX = event.clientX - dragStart.current.x;
    const nextY = event.clientY - dragStart.current.y;

    if (imageContainerRef.current) {
      const { width: viewportWidth, height: viewportHeight } = imageContainerRef.current.getBoundingClientRect();
      
      const effectiveImageWidth = viewportWidth * transform.scale;
      const effectiveImageHeight = viewportHeight * transform.scale;

      const limitX = Math.max(0, (effectiveImageWidth - viewportWidth) / 2);
      const limitY = Math.max(0, (effectiveImageHeight - viewportHeight) / 2);
      
      const clampedX = Math.max(-limitX, Math.min(limitX, nextX));
      const clampedY = Math.max(-limitY, Math.min(limitY, nextY));
      
      setTransform((prev) => ({
        ...prev,
        x: clampedX,
        y: clampedY,
      }));
    } else {
      setTransform((prev) => ({
        ...prev,
        x: nextX,
        y: nextY,
      }));
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleDownloadComparison = async () => {
    if (!hasReferences || !isCompareMode) return;
    setIsDownloadingComparison(true);

    try {
      const originalUrl = entry.inputImages[selectedReferenceIndex].url;
      const generatedUrl = entry.src;
      const width = entry.size.width;
      const height = entry.size.height;

      const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

      const [imgOriginal, imgGenerated] = await Promise.all([
        loadImage(originalUrl),
        loadImage(generatedUrl)
      ]);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No canvas context");

      // 1. Draw Generated (Background) - Full
      ctx.drawImage(imgGenerated, 0, 0, width, height);

      // 2. Draw Original (Foreground) - Clipped
      const splitX = (compareSliderPosition / 100) * width;
      
      ctx.save();
      ctx.beginPath();
      // Clip left side to show Original
      ctx.rect(0, 0, splitX, height);
      ctx.clip();
      
      ctx.drawImage(imgOriginal, 0, 0, width, height);
      ctx.restore();

      // 3. Draw the white line
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = Math.max(2, width * 0.002); 
      ctx.stroke();
      
      // 4. Convert to Blob and Download
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Canvas to Blob failed");

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateSmartFilename(`comparison ${entry.prompt}`, "png");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Failed to download comparison", e);
    } finally {
      setIsDownloadingComparison(false);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000]/95 backdrop-blur-sm p-0 md:px-4 md:py-8 outline-none animate-in fade-in duration-200"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-zoom-out"
        aria-label="Close image"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl border-0 md:border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-0 md:p-2 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col md:flex-row overflow-hidden">
        
        {/* Image Container */}
        <div 
          ref={imageContainerRef}
          className="relative flex-1 bg-black/50 md:rounded-xl overflow-hidden flex items-center justify-center min-h-0 md:min-h-[70vh]"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        >
            {canGoPrev ? (
              <button
                type="button"
                aria-label="Previous image"
                className="group absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white backdrop-blur transition hover:bg-white hover:text-black hover:shadow-lg focus:outline-none"
                onClick={(event) => {
                  event.stopPropagation();
                  onPrev();
                }}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            ) : null}
            
            <div 
              style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                cursor: isCompareMode ? 'default' : 'grab'
              }}
              className="relative flex h-full w-full items-center justify-center transition-transform duration-75 ease-out"
            >
              {isCompareMode && hasReferences ? (
                <div className="relative h-full w-full">
                  <CompareSlider
                    original={entry.inputImages[selectedReferenceIndex].url}
                    generated={entry.src}
                    originalAlt="Reference image"
                    generatedAlt={entry.prompt}
                    position={compareSliderPosition}
                    onPositionChange={setCompareSliderPosition}
                  />
                </div>
              ) : (
                <Image
                  src={entry.src}
                  alt={entry.prompt}
                  width={entry.size.width}
                  height={entry.size.height}
                  className="max-h-full w-auto max-w-full select-none object-contain shadow-lg"
                  draggable={false}
                  priority
                />
              )}
            </div>
            
            {canGoNext ? (
              <button
                type="button"
                aria-label="Next image"
                className="group absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white backdrop-blur transition hover:bg-white hover:text-black hover:shadow-lg focus:outline-none"
                onClick={(event) => {
                  event.stopPropagation();
                  onNext();
                }}
              >
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            ) : null}
        </div>

        {/* Sidebar for Details */}
        <div className="w-full md:w-[340px] bg-[var(--bg-panel)] p-4 md:p-6 flex flex-col border-l border-[var(--border-subtle)] max-h-[50vh] md:max-h-full">
           <div className="flex justify-between items-start mb-3 md:mb-4">
             <div className="flex flex-col gap-1">
               <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Details</h2>
               {totalCount > 1 && (
                 <span className="text-[10px] font-medium text-[var(--accent-primary)]">
                   {currentIndex + 1} of {totalCount}
                 </span>
               )}
             </div>
             <div className="flex items-center gap-2">
               {transform.scale !== 1 && (
                 <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-input)] px-2 py-1 rounded">
                   {zoomPercentage}%
                 </span>
               )}
               {/* Keyboard shortcut hint */}
               {onShowShortcuts && (
                 <button
                   type="button"
                   className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-subtle)] transition-colors"
                   onClick={onShowShortcuts}
                   title="Keyboard shortcuts (?)"
                 >
                   <KeyboardIcon className="h-4 w-4" />
                 </button>
               )}
               <button
                 type="button"
                 className="rounded-md p-2 -mt-2 -mr-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-subtle)]"
                 onClick={onClose}
               >
                 <span className="kbd kbd-sm">Esc</span>
               </button>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto pr-2">
             {/* Expanded Prompt Display */}
             <div className="relative group mb-4">
               <div className="flex items-start justify-between gap-2 mb-2">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Prompt</span>
                 <div className="flex items-center gap-1">
                   {/* Favorite Button */}
                   {onToggleFavorite && (
                     <button
                       type="button"
                       onClick={handleFavoriteClick}
                       className={`heart-btn p-1.5 rounded-md transition-all ${isFavorite ? "favorited" : "text-[var(--text-muted)] hover:text-[#ff4757]"} ${heartBurst ? "burst animate-heart-pop" : ""}`}
                       title={isFavorite ? "Remove from favorites (L)" : "Add to favorites (L)"}
                     >
                       {isFavorite ? <HeartFilledIcon className="h-4 w-4" /> : <HeartIcon className="h-4 w-4" />}
                     </button>
                   )}
                   {/* Copy Button */}
                   <button
                     type="button"
                     onClick={handleCopyPrompt}
                     className={`p-1.5 rounded-md transition-all ${copiedPrompt ? "copy-success" : "text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-input)]"}`}
                     title="Copy prompt (C)"
                   >
                     {copiedPrompt ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                   </button>
                 </div>
               </div>
               <div
                 className={`relative bg-[var(--bg-input)] rounded-lg p-3 border border-[var(--border-subtle)] ${showPromptExpanded ? "" : "cursor-pointer"}`}
                 onClick={() => !showPromptExpanded && entry.prompt.length > 150 && setShowPromptExpanded(true)}
               >
                 <p className={`text-sm leading-relaxed text-[var(--text-primary)] font-medium ${showPromptExpanded ? "max-h-64" : "max-h-24"} overflow-y-auto transition-all duration-300`}>
                   {entry.prompt}
                 </p>
                 {entry.prompt.length > 150 && !showPromptExpanded && (
                   <button
                     type="button"
                     onClick={() => setShowPromptExpanded(true)}
                     className="absolute bottom-2 right-2 text-[10px] font-semibold text-[var(--accent-primary)] hover:underline"
                   >
                     Show more
                   </button>
                 )}
                 {showPromptExpanded && (
                   <button
                     type="button"
                     onClick={() => setShowPromptExpanded(false)}
                     className="absolute bottom-2 right-2 text-[10px] font-semibold text-[var(--text-muted)] hover:text-white"
                   >
                     Show less
                   </button>
                 )}
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)] mb-3 md:mb-4">
                <div className="p-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                  <span className="block text-[10px] uppercase tracking-wide opacity-60 mb-1">Aspect</span>
                  {getAspectDescription(entry.aspect)}
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                  <span className="block text-[10px] uppercase tracking-wide opacity-60 mb-1">Quality</span>
                  {getQualityLabel(entry.quality)}
                </div>
             </div>

             {/* Thumbnail Reel */}
             {allEntries.length > 1 && onNavigateToEntry && (
               <div className="mb-4">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Gallery</span>
                 <div ref={thumbnailReelRef} className="thumbnail-reel">
                   {allEntries.map((thumbEntry, idx) => {
                     const thumbFavoriteId = `${thumbEntry.generationId}:${thumbEntry.imageIndex}`;
                     const isThumbFavorite = favorites.has(thumbFavoriteId);
                     const isActive = idx === currentIndex;
                     return (
                       <button
                         key={`${thumbEntry.generationId}-${thumbEntry.imageIndex}`}
                         type="button"
                         onClick={() => onNavigateToEntry(thumbEntry)}
                         className={`thumbnail-item relative ${isActive ? "active" : ""}`}
                       >
                         <Image
                           src={thumbEntry.src}
                           alt={thumbEntry.prompt}
                           fill
                           sizes="64px"
                           className="object-cover"
                         />
                         {isThumbFavorite && (
                           <HeartFilledIcon className="favorite-badge" />
                         )}
                       </button>
                     );
                   })}
                 </div>
               </div>
             )}
           </div>

           <div className="mt-auto pt-3 md:pt-4 border-t border-[var(--border-subtle)] space-y-2 flex flex-col gap-1">
              {/* Primary Actions Row */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-bold text-[var(--accent-primary-text)] shadow-[0_0_20px_-5px_rgba(255,215,0,0.3)] transition-all hover:bg-[var(--accent-primary-hover)] hover:shadow-[0_0_28px_-5px_rgba(255,215,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isDownloading ? "Saving..." : "Download"}</span>
                  <span className="kbd kbd-sm ml-1 bg-black/20 border-black/30 text-[var(--accent-primary-text)]">D</span>
                </button>

                {/* Upscale Button */}
                {canUpscale && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowUpscaleMenu((prev) => !prev)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${
                        showUpscaleMenu
                          ? "bg-[var(--accent-secondary)] border-[var(--accent-secondary)] text-white"
                          : "bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-white hover:border-[var(--text-muted)]"
                      }`}
                      title="Upscale image (U)"
                    >
                      <UpscaleIcon className="h-4 w-4" />
                      <span className="kbd kbd-sm">U</span>
                    </button>
                    {showUpscaleMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-[var(--bg-panel)] border border-[var(--border-highlight)] rounded-lg shadow-xl overflow-hidden z-10 min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="p-2 border-b border-[var(--border-subtle)]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Upscale to</span>
                        </div>
                        {upscaleOptions.map((targetQuality) => (
                          <button
                            key={targetQuality}
                            type="button"
                            onClick={() => {
                              onUpscale?.(targetQuality);
                              setShowUpscaleMenu(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                          >
                            <span>{getQualityLabel(targetQuality)}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {targetQuality === "2k" ? "2048px" : "4096px"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isCompareMode && hasReferences && (
                  <button
                    type="button"
                    onClick={handleDownloadComparison}
                    disabled={isDownloadingComparison}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloadingComparison ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
                    {isDownloadingComparison ? "Saving..." : "Save Comparison"}
                  </button>
              )}

              {hasReferences ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCompareMode(!isCompareMode)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold transition-colors hover:text-white hover:border-[var(--text-muted)] ${
                      isCompareMode
                        ? "bg-[var(--bg-subtle)] text-white border-[var(--text-muted)]"
                        : "bg-[var(--bg-input)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <span className="text-lg leading-none">⇄</span>
                    {isCompareMode ? "Exit Compare" : "Compare"}
                  </button>

                  {isCompareMode && entry.inputImages.length > 1 ? (
                    <div className="grid grid-cols-4 gap-2 rounded-lg bg-[var(--bg-subtle)] p-2">
                      {entry.inputImages.map((img, idx) => (
                        <button
                          type="button"
                          key={img.id || idx}
                          onClick={() => setSelectedReferenceIndex(idx)}
                          className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                            selectedReferenceIndex === idx
                              ? "border-[var(--accent-primary)] opacity-100"
                              : "border-transparent opacity-50 hover:opacity-100"
                          }`}
                          title={img.name}
                        >
                          <Image src={img.url} alt={img.name} fill className="object-cover" sizes="60px" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {onEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-white hover:border-[var(--text-muted)]"
                >
                  <PlusIcon className="h-4 w-4" />
                  Use as Reference
                </button>
              ) : null}

              {/* Keyboard Shortcuts Hint */}
              <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="kbd kbd-sm">←</span>
                  <span className="kbd kbd-sm">→</span>
                  <span className="ml-1">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="kbd kbd-sm">L</span>
                  <span className="ml-1">Like</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="kbd kbd-sm">?</span>
                  <span className="ml-1">More</span>
                </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}