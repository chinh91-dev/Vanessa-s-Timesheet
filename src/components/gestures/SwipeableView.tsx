import React, { ReactNode, useCallback } from "react";
import { useDrag } from "@use-gesture/react";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface SwipeableViewProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  enableHaptics?: boolean;
  className?: string;
}

export function SwipeableView({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 0.5,
  enableHaptics = true,
  className,
}: SwipeableViewProps) {
  const handleDrag = useCallback(({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], last }: any) => {
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
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold, enableHaptics]);

  const bind = useDrag(handleDrag, {}) as unknown as (...args: any[]) => Record<string, any>;

  return (
    <div
      {...bind()}
      className={cn("touch-pan-y", className)}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
