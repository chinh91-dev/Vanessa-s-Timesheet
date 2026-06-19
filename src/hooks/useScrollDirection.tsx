import { useState, useEffect, useRef } from 'react';
import { throttle } from '@/utils/device-detection';

interface UseScrollDirectionOptions {
  threshold?: number;
  throttleMs?: number;
}

interface UseScrollDirectionReturn {
  scrollDirection: 'up' | 'down';
  isAtTop: boolean;
  isAtBottom: boolean;
  scrollY: number;
}

/**
 * Hook to detect scroll direction for auto-hiding UI elements
 */
export const useScrollDirection = (
  options: UseScrollDirectionOptions = {}
): UseScrollDirectionReturn => {
  const { threshold = 10, throttleMs = 100 } = options;

  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Update scroll position
      setScrollY(currentScrollY);

      // Check if at top
      setIsAtTop(currentScrollY < threshold);

      // Check if at bottom
      setIsAtBottom(currentScrollY + windowHeight >= documentHeight - threshold);

      // Determine direction (only if scrolled past threshold)
      const diff = currentScrollY - lastScrollY.current;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          setScrollDirection('down');
        } else {
          setScrollDirection('up');
        }
        lastScrollY.current = currentScrollY;
      }
    };

    const throttledUpdate = throttle(updateScrollDirection, throttleMs);

    // Initial check
    updateScrollDirection();

    window.addEventListener('scroll', throttledUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledUpdate);
    };
  }, [threshold, throttleMs]);

  return { scrollDirection, isAtTop, isAtBottom, scrollY };
};

export default useScrollDirection;
