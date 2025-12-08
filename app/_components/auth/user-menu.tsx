"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./auth-context";

export function UserMenu() {
  const { user, isLoading, signInWithGoogle, signInWithGithub, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSignInOptions, setShowSignInOptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSignInOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-8 w-8 rounded-full bg-[var(--bg-input)] animate-pulse" />
    );
  }

  if (!user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowSignInOptions(!showSignInOptions)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-primary)] text-[var(--bg-app)] hover:opacity-90 transition-opacity"
        >
          <CloudIcon className="h-3.5 w-3.5" />
          <span>Sign in</span>
        </button>

        {showSignInOptions && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)]">
                Sign in to sync your generations across devices
              </p>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  signInWithGoogle();
                  setShowSignInOptions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[var(--bg-input)] transition-colors"
              >
                <GoogleIcon className="h-4 w-4" />
                <span>Continue with Google</span>
              </button>
              <button
                onClick={() => {
                  signInWithGithub();
                  setShowSignInOptions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[var(--bg-input)] transition-colors"
              >
                <GithubIcon className="h-4 w-4" />
                <span>Continue with GitHub</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--bg-input)] transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-7 w-7 rounded-full object-cover border border-[var(--border-subtle)]"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-xs font-bold text-[var(--bg-app)]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <ChevronIcon className={`h-3 w-3 text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
          </div>
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-success)]">
              <CloudCheckIcon className="h-3.5 w-3.5" />
              <span>Cloud sync enabled</span>
            </div>
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-error)] rounded-lg hover:bg-[var(--bg-input)] transition-colors"
            >
              <LogoutIcon className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

function CloudCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
