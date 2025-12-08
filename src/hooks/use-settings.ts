'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage, type Resolution, type AspectRatio, DEFAULT_RESOLUTION, DEFAULT_ASPECT_RATIO } from '@/lib/storage';

export function useSettings() {
  const [apiKey, setApiKeyState] = useState('');
  const [resolution, setResolutionState] = useState<Resolution>(DEFAULT_RESOLUTION);
  const [aspectRatio, setAspectRatioState] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setApiKeyState(storage.getApiKey());
    setResolutionState(storage.getResolution());
    setAspectRatioState(storage.getAspectRatio());
    setIsLoaded(true);
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    storage.setApiKey(key);
  }, []);

  const setResolution = useCallback((res: Resolution) => {
    setResolutionState(res);
    storage.setResolution(res);
  }, []);

  const setAspectRatio = useCallback((ratio: AspectRatio) => {
    setAspectRatioState(ratio);
    storage.setAspectRatio(ratio);
  }, []);

  return {
    apiKey,
    setApiKey,
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
    isLoaded,
    hasApiKey: apiKey.length > 0,
  };
}
