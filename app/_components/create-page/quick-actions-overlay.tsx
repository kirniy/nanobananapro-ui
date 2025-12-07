"use client";

import { useState } from "react";
import { HeartIcon, HeartFilledIcon, CopyIcon, CheckIcon, RefreshIcon } from "./icons";

type QuickActionsOverlayProps = {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCopyPrompt: () => void;
  onReuse?: () => void;
  visible: boolean;
};

export function QuickActionsOverlay({
  isFavorite,
  onToggleFavorite,
  onCopyPrompt,
  onReuse,
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
      </div>
    </div>
  );
}
