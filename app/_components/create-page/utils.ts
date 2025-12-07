import type { Generation } from "./types";

export function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function normalizeImages(images: string[]): string[] {
  return images.filter((src) => src && src.length > 0);
}

export function parseSeed(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function groupByDate(generations: Generation[]): {
  key: string;
  label: string;
  items: Generation[];
}[] {
  const map = new Map<string, Generation[]>();

  generations.forEach((generation) => {
    const key = new Date(generation.createdAt).toISOString().slice(0, 10);
    const existing = map.get(key) ?? [];
    existing.push(generation);
    map.set(key, existing);
  });

  return Array.from(map.entries())
    .map(([key, items]) => ({
      key,
      label: formatDisplayDate(items[0].createdAt),
      items,
    }))
    .sort((a, b) => new Date(b.items[0].createdAt).getTime() - new Date(a.items[0].createdAt).getTime());
}

export function formatDisplayDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Common words to filter out when extracting keywords
const STOPWORDS = new Set([
  // English stopwords
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
  "this", "that", "these", "those", "it", "its", "i", "you", "he", "she", "we", "they",
  "my", "your", "his", "her", "our", "their", "me", "him", "us", "them",
  "what", "which", "who", "whom", "where", "when", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some", "such",
  "no", "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "into", "over", "after", "before", "between", "under", "again", "further", "then",
  // JSON/prompt structure words
  "prompt", "negative", "negative_prompt", "style", "parameters", "settings", "config",
  "width", "height", "steps", "cfg", "scale", "seed", "sampler", "model", "checkpoint",
  "lora", "embedding", "vae", "clip", "output", "input", "image", "images", "type",
  "value", "key", "name", "description", "text", "content", "data", "true", "false",
  "null", "undefined", "none", "default", "quality", "resolution", "aspect", "ratio",
  // Common AI prompt words (too generic)
  "highly", "detailed", "realistic", "professional", "beautiful", "stunning", "amazing",
  "incredible", "perfect", "best", "high", "resolution", "hd", "4k", "8k", "uhd",
]);

// Extract all string values from a JSON object recursively
function extractJsonStrings(obj: unknown, depth = 0): string[] {
  if (depth > 10) return []; // Prevent infinite recursion

  if (typeof obj === "string") {
    return [obj];
  }

  if (Array.isArray(obj)) {
    return obj.flatMap((item) => extractJsonStrings(item, depth + 1));
  }

  if (obj && typeof obj === "object") {
    return Object.values(obj).flatMap((value) => extractJsonStrings(value, depth + 1));
  }

  return [];
}

// Score a word based on how likely it is to be a meaningful keyword
function scoreWord(word: string): number {
  const lower = word.toLowerCase();

  // Skip stopwords
  if (STOPWORDS.has(lower)) return 0;

  // Skip very short words
  if (word.length < 3) return 0;

  // Skip numbers-only
  if (/^\d+$/.test(word)) return 0;

  // Prefer medium-length descriptive words (4-12 chars)
  let score = word.length >= 4 && word.length <= 12 ? 2 : 1;

  // Boost words that look like descriptive nouns/adjectives
  if (/^[A-Z][a-z]+$/.test(word)) score += 1; // Capitalized words
  if (word.length >= 5 && word.length <= 10) score += 1; // Sweet spot length

  return score;
}

// Extract keywords from a prompt (handles both JSON and plain text)
export function extractKeywords(prompt: string, maxKeywords = 3): string[] {
  const trimmed = prompt.trim();

  if (!trimmed) return [];

  let candidateStrings: string[] = [];

  // Try to parse as JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      candidateStrings = extractJsonStrings(parsed);
    } catch {
      // Not valid JSON, treat as plain text
      candidateStrings = [trimmed];
    }
  } else {
    candidateStrings = [trimmed];
  }

  // Extract words from all candidate strings
  const allWords: { word: string; score: number }[] = [];

  for (const str of candidateStrings) {
    // Split on non-alphanumeric characters
    const words = str.split(/[^a-zA-Z0-9]+/).filter(Boolean);

    for (const word of words) {
      const score = scoreWord(word);
      if (score > 0) {
        allWords.push({ word: word.toLowerCase(), score });
      }
    }
  }

  // Deduplicate and sort by score (descending), then alphabetically for stability
  const seen = new Set<string>();
  const unique = allWords.filter(({ word }) => {
    if (seen.has(word)) return false;
    seen.add(word);
    return true;
  });

  unique.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  return unique.slice(0, maxKeywords).map(({ word }) => word);
}

// Format date/time for filename: DD-MM-YYYY-HH-MM-SS
export function formatFilenameTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}-${month}-${year}-${hours}-${minutes}-${seconds}`;
}

// Generate a smart filename from a prompt
export function generateSmartFilename(prompt: string, extension: string): string {
  const keywords = extractKeywords(prompt, 3);
  const timestamp = formatFilenameTimestamp();

  // Build filename parts
  const parts: string[] = [];

  if (keywords.length > 0) {
    parts.push(...keywords);
  } else {
    parts.push("image");
  }

  parts.push(timestamp);

  // Join with dashes and add extension
  const filename = parts.join("-");
  const ext = extension.startsWith(".") ? extension : `.${extension}`;

  return `${filename}${ext}`;
}
