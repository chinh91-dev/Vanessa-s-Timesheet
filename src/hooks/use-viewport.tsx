import { useState, useEffect } from "react";

export type Orientation = 'portrait' | 'landscape';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportState {
  width: number;
  height: number;
  orientation: Orientation;
  safeAreaInsets: SafeAreaInsets;
}

function getSafeAreaInsets(): SafeAreaInsets {
  // Get CSS environment variables for safe area (iOS notch, etc.)
  const getEnvValue = (variable: string): number => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return value ? parseInt(value, 10) : 0;
  };

  return {
    top: getEnvValue('env(safe-area-inset-top)') || 0,
    right: getEnvValue('env(safe-area-inset-right)') || 0,
    bottom: getEnvValue('env(safe-area-inset-bottom)') || 0,
    left: getEnvValue('env(safe-area-inset-left)') || 0,
  };
}

export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation: Orientation = width > height ? 'landscape' : 'portrait';

    return {
      width,
      height,
      orientation,
      safeAreaInsets: getSafeAreaInsets(),
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation: Orientation = width > height ? 'landscape' : 'portrait';

      setViewport({
        width,
        height,
        orientation,
        safeAreaInsets: getSafeAreaInsets(),
      });
    };

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Also listen for orientation change (mobile specific)
    if ('orientationchange' in window) {
      window.addEventListener('orientationchange', handleResize);
    }

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      if ('orientationchange' in window) {
        window.removeEventListener('orientationchange', handleResize);
      }
    };
  }, []);

  return viewport;
}
