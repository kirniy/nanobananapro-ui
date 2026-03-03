"use client";

import { useCallback, useRef, useState } from "react";
import { SpinnerIcon } from "./icons";

type KeyStatus = "alive" | "dead" | "unknown" | "testing";

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

const TEST_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

async function testSingleKey(key: string): Promise<KeyStatus> {
  try {
    const response = await fetch(`${TEST_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "test" }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    });

    if (response.ok) return "alive";
    if (response.status >= 400 && response.status < 500) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

const CONCURRENCY = 5;

type KeyManagerProps = {
  keys: string[];
  onChange: (keys: string[]) => void;
};

export function KeyManager({ keys, onChange }: KeyManagerProps) {
  const [statuses, setStatuses] = useState<Map<string, KeyStatus>>(new Map());
  const [isTesting, setIsTesting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const abortRef = useRef(false);

  const hasDeadKeys = Array.from(statuses.entries()).some(
    ([key, status]) => status === "dead" && keys.includes(key),
  );

  const addKeys = useCallback(() => {
    const newKeys = pasteText
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (newKeys.length === 0) return;

    const existing = new Set(keys);
    const deduped = newKeys.filter((k) => !existing.has(k));
    if (deduped.length > 0) {
      onChange([...keys, ...deduped]);
    }
    setPasteText("");
    setShowPaste(false);
  }, [pasteText, keys, onChange]);

  const removeKey = useCallback(
    (index: number) => {
      const removed = keys[index];
      onChange(keys.filter((_, i) => i !== index));
      setStatuses((prev) => {
        const next = new Map(prev);
        next.delete(removed);
        return next;
      });
    },
    [keys, onChange],
  );

  const activateKey = useCallback(
    (index: number) => {
      if (index === 0) return;
      const next = [...keys];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      onChange(next);
    },
    [keys, onChange],
  );

  const removeDead = useCallback(() => {
    const alive = keys.filter((k) => statuses.get(k) !== "dead");
    const deadKeys = keys.filter((k) => statuses.get(k) === "dead");
    onChange(alive);
    setStatuses((prev) => {
      const next = new Map(prev);
      for (const k of deadKeys) next.delete(k);
      return next;
    });
  }, [keys, statuses, onChange]);

  const testAllKeys = useCallback(async () => {
    if (keys.length === 0) return;
    setIsTesting(true);
    abortRef.current = false;

    // Mark all as testing
    setStatuses(new Map(keys.map((k) => [k, "testing"])));

    // Process in batches of CONCURRENCY
    const queue = [...keys];
    const runBatch = async () => {
      const batch = queue.splice(0, CONCURRENCY);
      await Promise.all(
        batch.map(async (key) => {
          if (abortRef.current) return;
          const result = await testSingleKey(key);
          if (!abortRef.current) {
            setStatuses((prev) => new Map(prev).set(key, result));
          }
        }),
      );
      if (queue.length > 0 && !abortRef.current) {
        await runBatch();
      }
    };

    await runBatch();
    setIsTesting(false);
  }, [keys]);

  const statusBadge = (status: KeyStatus | undefined) => {
    switch (status) {
      case "alive":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-800/50">
            OK
          </span>
        );
      case "dead":
        return (
          <span className="inline-flex items-center rounded-full bg-red-950/40 px-1.5 py-0.5 text-[9px] font-bold text-red-400 border border-red-800/50">
            DEAD
          </span>
        );
      case "testing":
        return <SpinnerIcon className="h-3 w-3 animate-spin text-[var(--text-muted)]" />;
      case "unknown":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-950/40 px-1.5 py-0.5 text-[9px] font-bold text-yellow-400 border border-yellow-800/50">
            ???
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        Gemini API Keys
      </span>

      {/* Key list */}
      {keys.length > 0 ? (
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
          {keys.map((key, index) => (
            <div
              key={`${key}-${index}`}
              onClick={() => activateKey(index)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-mono transition-colors ${
                index === 0
                  ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-secondary)] cursor-pointer hover:border-[var(--text-muted)]"
              }`}
              title={index === 0 ? "Active key" : "Click to set as active"}
            >
              {index === 0 ? (
                <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--accent-primary)] shrink-0">
                  Active
                </span>
              ) : null}
              <span className="flex-1 truncate">{maskKey(key)}</span>
              {statusBadge(statuses.get(key))}
              <button
                type="button"
                onClick={() => removeKey(index)}
                className="shrink-0 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                title="Remove key"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] italic text-[var(--text-muted)]">No keys added yet.</p>
      )}

      {/* Action buttons row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setShowPaste(!showPaste)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {showPaste ? "Cancel" : "+ Add Keys"}
        </button>

        {keys.length > 0 && !showPaste && (
          <button
            type="button"
            onClick={testAllKeys}
            disabled={isTesting}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 transition-colors disabled:opacity-50"
          >
            {isTesting ? "Testing..." : "Test All"}
          </button>
        )}

        {hasDeadKeys && !isTesting && !showPaste && (
          <button
            type="button"
            onClick={removeDead}
            className="rounded-lg border border-red-900/50 bg-red-950/20 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-red-400 hover:bg-red-950/40 transition-colors"
          >
            Remove Dead
          </button>
        )}
      </div>

      {/* Paste textarea */}
      {showPaste && (
        <div className="space-y-1.5">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Paste API keys, one per line...\nAIzaSy...\nAIzaSy..."}
            rows={4}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-xs font-mono text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]/50 focus:border-white focus:text-white focus:outline-none transition-all resize-none"
          />
          <button
            type="button"
            onClick={addKeys}
            disabled={pasteText.trim().length === 0}
            className="w-full rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors disabled:opacity-30"
          >
            Add Keys
          </button>
        </div>
      )}

      <p className="text-[9px] text-[var(--text-muted)]">
        Keys are stored locally on your device and only sent to Google&apos;s API.
      </p>
    </div>
  );
}
