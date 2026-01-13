"use client";

import { useState, useEffect } from "react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedKey, setSharedKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAdminAndLoadKey();
    }
  }, [isOpen]);

  async function checkAdminAndLoadKey() {
    setIsLoading(true);
    try {
      // Check admin status
      const adminRes = await fetch("/api/admin/check");
      const adminData = await adminRes.json();

      if (!adminData.isAdmin) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load current shared key
      const keyRes = await fetch("/api/admin/shared-key");
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        setSharedKey(keyData.key || "");
        setNewKey(keyData.key || "");
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
      setMessage({ type: "error", text: "Failed to load admin data" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!newKey.trim()) {
      setMessage({ type: "error", text: "Please enter a key" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/shared-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSharedKey(data.key);
        setMessage({ type: "success", text: "Shared key updated successfully!" });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to update key" });
      }
    } catch (error) {
      console.error("Failed to save key:", error);
      setMessage({ type: "error", text: "Failed to save key" });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Admin Panel</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-[var(--text-muted)]">Loading...</div>
        ) : !isAdmin ? (
          <div className="py-8 text-center text-[var(--text-muted)]">
            You don&apos;t have admin access.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Shared Gemini API Key
              </label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Enter Gemini API key"
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              />
              {sharedKey && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Current: ...{sharedKey.slice(-8)}
                </p>
              )}
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || newKey === sharedKey}
                className="flex-1 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
