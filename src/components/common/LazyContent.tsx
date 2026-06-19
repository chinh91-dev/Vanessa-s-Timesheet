
import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LazyContentProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  once?: boolean;
  priority?: boolean;
}

export const LazyContent: React.FC<LazyContentProps> = ({
  children,
  fallback = <div className="animate-pulse bg-gray-200 rounded h-24 w-full" />,
  threshold = 0.1,
  rootMargin = '100px',
  className,
  once = true,
  priority = false,
}) => {
  const [isVisible, setIsVisible] = useState(priority);
  const [hasBeenVisible, setHasBeenVisible] = useState(priority);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        
        if (isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, once, priority]);

  const shouldRender = once ? hasBeenVisible : isVisible;

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {shouldRender ? children : fallback}
    </div>
  );
};

export default LazyContent;
