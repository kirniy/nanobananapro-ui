"use client";

import { useEffect } from "react";
import { usePlatform } from "./hooks/use-platform";

type ShortcutItem = {
  keys: string[];
  description: string;
  scope?: string;
};

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["←", "→"], description: "Navigate images", scope: "Lightbox" },
  { keys: ["Esc"], description: "Close lightbox", scope: "Lightbox" },
  { keys: ["L"], description: "Toggle favorite", scope: "Lightbox" },
  { keys: ["C"], description: "Copy prompt", scope: "Lightbox" },
  { keys: ["shift", "C"], description: "Copy image", scope: "Lightbox" },
  { keys: ["D"], description: "Download image", scope: "Lightbox" },
  { keys: ["U"], description: "Upscale menu", scope: "Lightbox" },
  { keys: ["?"], description: "Show shortcuts", scope: "Global" },
];

type KeyboardShortcutsPanelProps = {
  onClose: () => void;
};

export function KeyboardShortcutsPanel({ onClose }: KeyboardShortcutsPanelProps) {
  const { isMac, modSymbol, altSymbol, shiftSymbol } = usePlatform();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Group shortcuts by scope
  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    const scope = shortcut.scope || "General";
    if (!acc[scope]) {
      acc[scope] = [];
    }
    acc[scope].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  return (
    <>
      {/* Backdrop */}
      <div
        className="shortcuts-panel-backdrop"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        aria-label="Close shortcuts panel"
      />

      {/* Panel */}
      <div className="shortcuts-panel" role="dialog" aria-label="Keyboard shortcuts">
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <span className="kbd kbd-sm">Esc</span>
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {isMac ? "Mac" : "Windows/Linux"} keyboard layout
          </p>
        </div>

        <div className="p-4 space-y-6">
          {Object.entries(groupedShortcuts).map(([scope, shortcuts]) => (
            <div key={scope}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] mb-3">
                {scope}
              </h3>
              <div className="space-y-1">
                {shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="shortcut-row rounded-lg">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {shortcut.description}
                    </span>
                    <div className="shortcut-keys">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className={`kbd ${key.length === 1 && key !== "?" ? "" : "kbd-symbol"}`}>
                          {key === "mod" ? modSymbol : key === "alt" ? altSymbol : key === "shift" ? shiftSymbol : key}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            Press <span className="kbd kbd-sm">?</span> anytime to show this panel
          </p>
        </div>
      </div>
    </>
  );
}
