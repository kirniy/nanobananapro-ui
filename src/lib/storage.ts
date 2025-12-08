// localStorage utilities for persisting settings

const STORAGE_KEYS = {
  API_KEY: 'nano-banana-api-key',
  RESOLUTION: 'nano-banana-resolution',
  ASPECT_RATIO: 'nano-banana-aspect-ratio',
} as const;

export type Resolution = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

export const RESOLUTIONS: Resolution[] = ['1K', '2K', '4K'];
export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '16:9', '9:16', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '21:9'];

export const DEFAULT_RESOLUTION: Resolution = '4K';
export const DEFAULT_ASPECT_RATIO: AspectRatio = '16:9';

function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export const storage = {
  getApiKey: (): string => getItem(STORAGE_KEYS.API_KEY, ''),
  setApiKey: (key: string): void => setItem(STORAGE_KEYS.API_KEY, key),

  getResolution: (): Resolution => getItem(STORAGE_KEYS.RESOLUTION, DEFAULT_RESOLUTION),
  setResolution: (res: Resolution): void => setItem(STORAGE_KEYS.RESOLUTION, res),

  getAspectRatio: (): AspectRatio => getItem(STORAGE_KEYS.ASPECT_RATIO, DEFAULT_ASPECT_RATIO),
  setAspectRatio: (ratio: AspectRatio): void => setItem(STORAGE_KEYS.ASPECT_RATIO, ratio),
};
