/**
 * Haptic Feedback System
 * Provides vibration patterns for different user interactions
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,           // Quick tap - button press
  medium: 20,          // Navigation, toggle
  heavy: [30, 10, 30], // Confirmation, important action
  success: [10, 50, 10], // Success feedback
  error: [50, 100, 50],  // Error feedback
  selection: 5,        // Selection change, swipe
};

/**
 * Trigger haptic feedback with specified pattern
 * Falls back gracefully if vibration API not available
 */
export const triggerHaptic = (pattern: HapticPattern): boolean => {
  if (!('vibrate' in navigator)) {
    return false;
  }

  try {
    const vibration = patterns[pattern];
    navigator.vibrate(vibration);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if haptic feedback is available
 */
export const isHapticAvailable = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Stop any ongoing vibration
 */
export const stopHaptic = (): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
};

/**
 * Custom haptic pattern
 * @param pattern - Array of vibration and pause durations in ms
 * Example: [100, 50, 100] = vibrate 100ms, pause 50ms, vibrate 100ms
 */
export const triggerCustomHaptic = (pattern: number[]): boolean => {
  if (!('vibrate' in navigator)) {
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
};
