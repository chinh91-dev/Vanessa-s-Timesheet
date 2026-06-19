import { useState, useEffect } from "react";

export interface TouchCapabilities {
  hasTouch: boolean;
  maxTouchPoints: number;
  isPointerCoarse: boolean;
  supportsVibration: boolean;
}

export function useTouchDetection(): TouchCapabilities {
  const [capabilities, setCapabilities] = useState<TouchCapabilities>(() => ({
    hasTouch: false,
    maxTouchPoints: 0,
    isPointerCoarse: false,
    supportsVibration: false,
  }));

  useEffect(() => {
    // Detect touch support
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    // Get max simultaneous touch points
    const maxTouchPoints =
      navigator.maxTouchPoints ||
      (navigator as any).msMaxTouchPoints ||
      0;

    // Check if pointer is coarse (touchscreen vs mouse)
    const isPointerCoarse = window.matchMedia("(pointer: coarse)").matches;

    // Check vibration API support
    const supportsVibration = 'vibrate' in navigator;

    setCapabilities({
      hasTouch,
      maxTouchPoints,
      isPointerCoarse,
      supportsVibration,
    });
  }, []);

  return capabilities;
}
