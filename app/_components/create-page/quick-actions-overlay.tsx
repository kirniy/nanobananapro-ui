"use client";

import { useState } from "react";
import { HeartIcon, HeartFilledIcon, CopyIcon, CheckIcon, RefreshIcon, DownloadIcon } from "./icons";

type QuickActionsOverlayProps = {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCopyPrompt: () => void;
  onReuse?: () => void;
  onDownload?: () => void;
  onSaveToPrompts?: () => void;
  visible: boolean;
};

export function QuickActionsOverlay({
  isFavorite,
  onToggleFavorite,
  onCopyPrompt,
  onReuse,
  onDownload,
  onSaveToPrompts,
  visible,
}: QuickActionsOverlayProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  const handleCopyPrompt = () => {
    onCopyPrompt();
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleFavoriteClick = () => {
    if (!isFavorite) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 400);
    }
    onToggleFavorite();
  };

  return (
    <div className={`quick-actions-overlay ${visible ? "visible" : ""}`}>
      <div className="quick-actions-bar">
        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteClick();
          }}
          className={`quick-action-btn ${isFavorite ? "favorited" : ""} ${heartBurst ? "animate-heart-pop" : ""}`}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? <HeartFilledIcon className="h-4 w-4" /> : <HeartIcon className="h-4 w-4" />}
        </button>

        {/* Copy Prompt Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyPrompt();
          }}
          className={`quick-action-btn ${copiedPrompt ? "text-[var(--color-success)]" : ""}`}
          title="Copy prompt"
        >
          {copiedPrompt ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        </button>

        {/* Reuse Prompt Button */}
        {onReuse && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReuse();
            }}
            className="quick-action-btn"
            title="Reuse this prompt"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        )}

        {/* Download Button */}
        {onDownload && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="quick-action-btn"
            title="Download image"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
        )}

        {/* Save to Prompts Button */}
        {onSaveToPrompts && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSaveToPrompts();
            }}
            className="quick-action-btn"
            title="Save to Prompts"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
