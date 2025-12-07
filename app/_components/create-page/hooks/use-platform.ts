"use client";

import { useEffect, useState } from "react";

type Platform = "mac" | "windows" | "other";

type PlatformInfo = {
  platform: Platform;
  isMac: boolean;
  isWindows: boolean;
  modKey: string;
  modSymbol: string;
  altSymbol: string;
  shiftSymbol: string;
};

/**
 * Detects the user's operating system for platform-specific keyboard shortcut display.
 * Returns appropriate key symbols for Mac (⌘, ⌥, ⇧) vs Windows/Linux (Ctrl, Alt, Shift).
 */
export function usePlatform(): PlatformInfo {
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    // Modern approach using userAgentData (Chrome 90+, Edge 90+)
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    if (uaData?.platform) {
      const p = uaData.platform.toLowerCase();
      if (p === "macos") {
        setPlatform("mac");
        return;
      }
      if (p === "windows") {
        setPlatform("windows");
        return;
      }
    }

    // Fallback to userAgent string
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac")) {
      setPlatform("mac");
    } else if (ua.includes("win")) {
      setPlatform("windows");
    } else {
      setPlatform("other");
    }
  }, []);

  const isMac = platform === "mac";
  const isWindows = platform === "windows";

  return {
    platform,
    isMac,
    isWindows,
    modKey: isMac ? "Meta" : "Control",
    modSymbol: isMac ? "⌘" : "Ctrl",
    altSymbol: isMac ? "⌥" : "Alt",
    shiftSymbol: isMac ? "⇧" : "Shift",
  };
}

/**
 * Key symbols for common keyboard keys, with platform-specific variants.
 */
export const KEY_SYMBOLS: Record<string, { mac: string; windows: string; label: string }> = {
  // Modifier keys
  cmd: { mac: "⌘", windows: "Ctrl", label: "Command/Control" },
  ctrl: { mac: "⌃", windows: "Ctrl", label: "Control" },
  alt: { mac: "⌥", windows: "Alt", label: "Alt/Option" },
  shift: { mac: "⇧", windows: "Shift", label: "Shift" },

  // Navigation keys
  escape: { mac: "Esc", windows: "Esc", label: "Escape" },
  enter: { mac: "↵", windows: "Enter", label: "Enter" },
  tab: { mac: "⇥", windows: "Tab", label: "Tab" },
  space: { mac: "Space", windows: "Space", label: "Space" },
  backspace: { mac: "⌫", windows: "Backspace", label: "Backspace" },
  delete: { mac: "⌦", windows: "Del", label: "Delete" },

  // Arrow keys
  up: { mac: "↑", windows: "↑", label: "Up Arrow" },
  down: { mac: "↓", windows: "↓", label: "Down Arrow" },
  left: { mac: "←", windows: "←", label: "Left Arrow" },
  right: { mac: "→", windows: "→", label: "Right Arrow" },
};

/**
 * Returns the display symbol for a key based on platform.
 */
export function getKeySymbol(key: string, isMac: boolean): string {
  const symbol = KEY_SYMBOLS[key.toLowerCase()];
  if (symbol) {
    return isMac ? symbol.mac : symbol.windows;
  }
  // For regular letter keys, return uppercase
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
}
