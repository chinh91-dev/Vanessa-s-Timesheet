/**
 * Haptic feedback utility using the Vibration API
 * Provides tactile feedback for touch interactions on mobile devices
 *
 * This is an object-based API adapter for consistency with childcare-management-app
 */

import { triggerHaptic, isHapticAvailable } from '@/utils/haptic';

export const haptics = {
  /**
   * Light haptic feedback (10ms)
   * Use for: Button taps, selection changes
   */
  light: () => {
    triggerHaptic('light');
  },

  /**
   * Medium haptic feedback (20ms)
   * Use for: Navigation changes, toggle switches
   */
  medium: () => {
    triggerHaptic('medium');
  },

  /**
   * Heavy haptic feedback (30ms, pause, 30ms)
   * Use for: Important confirmations, warnings
   */
  heavy: () => {
    triggerHaptic('heavy');
  },

  /**
   * Success haptic pattern (10ms, pause, 10ms)
   * Use for: Successful actions, form submissions
   */
  success: () => {
    triggerHaptic('success');
  },

  /**
   * Error haptic pattern (50ms, pause, 50ms)
   * Use for: Errors, failed validations
   */
  error: () => {
    triggerHaptic('error');
  },

  /**
   * Selection haptic feedback (5ms)
   * Use for: Selecting items from a list, swiping
   */
  selection: () => {
    triggerHaptic('selection');
  },

  /**
   * Check if vibration is supported
   */
  isSupported: (): boolean => {
    return isHapticAvailable();
  },
};
