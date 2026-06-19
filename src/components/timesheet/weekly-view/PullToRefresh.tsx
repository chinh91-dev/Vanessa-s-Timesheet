import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh at scroll top
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    // Only pull down
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      // Apply resistance: more pull = less movement
      const resistance = Math.min(distance / 2, threshold);
      setPullDistance(resistance);

      // Prevent default scroll when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        touchStartY.current = 0;
      }
    } else {
      // Reset without refreshing
      setPullDistance(0);
      touchStartY.current = 0;
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const pullProgress = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center",
          "transition-all duration-200 overflow-hidden bg-gradient-to-b from-primary/5 to-transparent"
        )}
        style={{
          height: `${pullDistance}px`,
          opacity: pullProgress / 100
        }}
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-primary transition-transform duration-200",
            isRefreshing && "animate-spin",
            pullProgress >= 100 && !isRefreshing && "rotate-180"
          )}
        />
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};
