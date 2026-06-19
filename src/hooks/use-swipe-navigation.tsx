import { useDrag } from "@use-gesture/react";
import { haptics } from "@/lib/haptics";

export interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  enableHaptics?: boolean;
}

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 0.5,
  enableHaptics = true,
}: UseSwipeNavigationOptions) {
  return useDrag(({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], last }) => {
    if (!last) return;
    
    // Check horizontal swipes
    if (Math.abs(mx) > Math.abs(my) && (Math.abs(vx) > velocityThreshold || Math.abs(mx) > threshold)) {
      if (dx > 0 && onSwipeRight) {
        if (enableHaptics) haptics.selection();
        onSwipeRight();
      } else if (dx < 0 && onSwipeLeft) {
        if (enableHaptics) haptics.selection();
        onSwipeLeft();
      }
    }
    
    // Check vertical swipes
    if (Math.abs(my) > Math.abs(mx) && (Math.abs(vy) > velocityThreshold || Math.abs(my) > threshold)) {
      if (dy > 0 && onSwipeDown) {
        if (enableHaptics) haptics.selection();
        onSwipeDown();
      } else if (dy < 0 && onSwipeUp) {
        if (enableHaptics) haptics.selection();
        onSwipeUp();
      }
    }
  }, {}) as unknown as (...args: any[]) => Record<string, any>;
}
