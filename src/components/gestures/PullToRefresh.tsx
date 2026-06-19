import React, { useState, useRef, ReactNode } from "react";
import { useDrag } from "@use-gesture/react";
import { useSpring, animated, config } from "@react-spring/web";
import { Loader2, RefreshCw } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  const bind = useDrag(
    async ({ last, movement: [, my], velocity: [, vy], direction: [, dy], cancel }) => {
      // Only allow pulling down when at the top of the scroll
      const container = containerRef.current;
      if (!container || disabled || refreshing) return;

      const isAtTop = container.scrollTop === 0;
      if (!isAtTop) return;

      // Only allow downward pulls
      if (my < 0) {
        api.start({ y: 0, immediate: true });
        return;
      }

      // Calculate pull distance with resistance
      const resistance = 0.4; // Makes it feel like pulling against resistance
      const adjustedDistance = Math.pow(my, 0.8) * resistance;
      setPullDistance(adjustedDistance);

      if (last) {
        // User released
        if (adjustedDistance > threshold) {
          // Trigger refresh
          haptics.medium();
          setRefreshing(true);
          api.start({ y: threshold, config: config.wobbly });

          try {
            await onRefresh();
            haptics.success();
          } catch (error) {
            console.error("Refresh failed:", error);
            haptics.error();
          } finally {
            setRefreshing(false);
            api.start({ y: 0, config: config.gentle });
            setPullDistance(0);
          }
        } else {
          // Didn't pull far enough, snap back
          api.start({ y: 0, config: config.wobbly });
          setPullDistance(0);
        }
      } else {
        // User is pulling
        api.start({ y: adjustedDistance, immediate: true });

        // Provide haptic feedback when reaching threshold
        if (adjustedDistance > threshold && pullDistance <= threshold) {
          haptics.light();
        }
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  const iconRotation = pullDistance / threshold * 180;
  const isOverThreshold = pullDistance > threshold;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto h-full", className)}
    >
      {/* Pull indicator */}
      <animated.div
        style={{ y }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200",
            pullDistance > 0 ? "opacity-100 scale-100" : "opacity-0 scale-50",
            isOverThreshold && "bg-primary text-primary-foreground"
          )}
          style={{
            width: Math.min(50 + pullDistance * 0.2, 60),
            height: Math.min(50 + pullDistance * 0.2, 60),
          }}
        >
          {refreshing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <RefreshCw
              className={cn(
                "w-6 h-6 transition-transform",
                isOverThreshold && "text-primary-foreground"
              )}
              style={{
                transform: `rotate(${iconRotation}deg)`,
              }}
            />
          )}
        </div>
      </animated.div>

      {/* Content */}
      <animated.div
        {...bind()}
        style={{ y }}
        className="touch-pan-y min-h-full"
      >
        {children}
      </animated.div>
    </div>
  );
}
