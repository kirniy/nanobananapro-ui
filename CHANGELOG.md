# Changelog

All notable changes to Nano Banana Pro are documented here.

## [1.2.0] - 2026-01-13

### New Features

- **Self-Hosted Backend**: Migrated from Supabase to a self-hosted VPS backend for better control and reliability
  - PostgreSQL database with Fastify API
  - Maintained Google and GitHub OAuth authentication via NextAuth.js
  - All existing cloud sync functionality preserved

- **Admin Panel**: New admin-only panel for managing shared API keys
  - Configure a shared Gemini API key for all users
  - Users can load shared API key with one click (when signed in)

- **Copy Image to Clipboard**: Quickly copy any generated image
  - Use `Shift+C` keyboard shortcut in lightbox
  - Or click the copy button in the lightbox action bar

### Bug Fixes

- Fixed cloud sync not saving generations (backend data format mismatch)

---

## [1.1.0] - 2025-12-08

### New Features

- **Cloud Sync**: Sign in with Google or GitHub to sync your generations across devices
  - Automatic sync of generations, favorites, and settings
  - Local storage continues to work for anonymous users
  - Toggle image sync on/off in settings

- **Prompts Library**: Save and organize your favorite prompts
  - Create categories with custom colors
  - Save prompts with attachments directly from generation views
  - Cloud sync for prompts (requires sign in)

- **Midjourney-Style Features**:
  - **Favorites System**: Heart your best generations with `L` key or click
  - **Thumbnail Reel**: Navigate through images in lightbox with thumbnails
  - **Quick Actions**: Hover overlay for like, copy prompt, and reuse
  - **Upscale**: Enlarge images from 1K→2K/4K or 2K→4K
  - **Smart Filenames**: Downloaded images include keywords from prompt

- **Keyboard Shortcuts Panel**: Press `?` to see all available shortcuts
  - Platform-aware key icons (Mac ⌘/⌥ vs Windows Ctrl/Alt)
  - Navigate with `←` `→`, like with `L`, copy with `C`, download with `D`

- **Download Button**: Download any image directly from the Create tab hover menu

- **Storage Management**: Automatic cleanup of old generations (keeps most recent 500)

- **API Key Encryption**: Your API keys are stored securely with encryption

### Improvements

- Gallery action bar repositioned to prevent cropping
- Local data is now the source of truth during cloud sync (prevents data loss)
- Better handling of blob URLs during upload
- Expanded prompt display in lightbox with show more/less toggle

### Bug Fixes

- Fixed nested button hydration error in image tiles
- Fixed build errors for Vercel deployment
- Fixed category and prompt creation failing silently
- Fixed images disappearing when navigating between tabs

---

## [1.0.0] - 2025-12-06

### New Features

- **Rebranded to Nano Banana Pro**: New tropical theme with banana favicon
- **Vercel Deployment**: Easy one-click deployment support
- **Client-Side Generation**: Image generation now happens in the browser for better performance

### Documentation

- Added fork attribution to original Dreamint project
- Added deployment instructions
- Added documentation for potential Gemini Batch Mode integration

---

## [0.9.0] - 2025-11-26

### New Features

- **Compare Mode**: Side-by-side comparison in lightbox with zoom and pan controls
  - Comparison slider when editing images
  - Save comparison as a single image

- **Long Prompt Support**: Scrollable prompt area for lengthy prompts
- **Increased Timeout**: Generation timeout increased for complex images

### Improvements

- Mobile responsiveness improvements
- Lightbox height fixes for various screen sizes

### Bug Fixes

- Fixed downloaded image filename prefix
- Fixed stale pending jobs when no API keys are set

---

## [0.8.0] - 2025-11-25

### New Features

- **Gemini Redesign**: Switched from Vertex AI to direct Gemini API
  - Simpler setup - just need a Gemini API key
  - Better performance and reliability

- **Drag-and-Drop Uploads**: Drop images directly into the prompt bar

### Improvements

- Refreshed README documentation
- Polished generation UX

---

## [0.7.0] - 2025-09-28

### Bug Fixes

- Fixed sharp/blurry image quality issues
- Fixed image size when editing

---

## [0.6.0] - 2025-09-22

### Initial Release

- First public commit
- Basic image generation with Gemini
- Gallery view for generated images
- Local storage for generations
- Fixed native Image constructor usage

---

*Nano Banana Pro is a fork of [Dreamint](https://github.com/example/dreamint) with enhanced features for AI image generation.*
