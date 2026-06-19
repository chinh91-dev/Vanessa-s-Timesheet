
import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/use-mobile';

export interface LayoutPreferences {
  gridDensity: 'compact' | 'comfortable' | 'spacious';
  sidebarCollapsed: boolean;
  viewMode: 'grid' | 'list';
  cardsPerRow: number;
}

const STORAGE_KEY = 'layout-preferences';

const getDefaultPreferences = (screenWidth: number): LayoutPreferences => {
  // Smart defaults based on screen size
  if (screenWidth < 768) {
    return {
      gridDensity: 'compact',
      sidebarCollapsed: true,
      viewMode: 'list',
      cardsPerRow: 1,
    };
  } else if (screenWidth < 1024) {
    return {
      gridDensity: 'comfortable',
      sidebarCollapsed: false,
      viewMode: 'grid',
      cardsPerRow: 2,
    };
  } else if (screenWidth < 1440) {
    return {
      gridDensity: 'comfortable',
      sidebarCollapsed: false,
      viewMode: 'grid',
      cardsPerRow: 3,
    };
  } else {
    return {
      gridDensity: 'spacious',
      sidebarCollapsed: false,
      viewMode: 'grid',
      cardsPerRow: 4,
    };
  }
};

export const useLayoutPreferences = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [preferences, setPreferences] = useState<LayoutPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall back to defaults if parsing fails
      }
    }
    return getDefaultPreferences(window.innerWidth);
  });

  // The previous resize listener only updated defaults when no stored
  // preferences existed — but on first mount we always write to
  // localStorage below, so the listener was effectively dead. Removed
  // to drop the no-op event handler.

  // Persist preferences. Writes are debounced through a microtask so
  // rapid slider drags don't hammer localStorage.
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (e) {
        console.warn('[useLayoutPreferences] localStorage write failed:', e);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [preferences]);

  const updatePreference = <K extends keyof LayoutPreferences>(
    key: K,
    value: LayoutPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(getDefaultPreferences(window.innerWidth));
  };

  return {
    preferences,
    updatePreference,
    resetToDefaults,
    isMobile,
  };
};
