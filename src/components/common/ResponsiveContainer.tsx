
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number, height: number) => void;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  minWidth = 0,
  maxWidth = Infinity,
  onResize,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        onResize?.(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [onResize]);

  const getResponsiveClasses = () => {
    const { width } = dimensions;
    
    if (width === 0) return '';
    
    const classes = [];
    
    // Container query based classes
    if (width >= 320) classes.push('cq-xs');
    if (width >= 480) classes.push('cq-sm');
    if (width >= 640) classes.push('cq-md');
    if (width >= 768) classes.push('cq-lg');
    if (width >= 1024) classes.push('cq-xl');
    if (width >= 1280) classes.push('cq-2xl');
    if (width >= 1920) classes.push('cq-3xl');
    
    return classes.join(' ');
  };

  const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, dimensions.width));

  return (
    <div
      ref={containerRef}
      className={cn(
        'container-query w-full',
        getResponsiveClasses(),
        className
      )}
      style={{
        maxWidth: maxWidth !== Infinity ? `${maxWidth}px` : undefined,
        minWidth: minWidth > 0 ? `${minWidth}px` : undefined,
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;
