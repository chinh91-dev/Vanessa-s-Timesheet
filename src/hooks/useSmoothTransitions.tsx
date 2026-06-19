
import { useEffect, useState } from 'react';

interface TransitionConfig {
  duration?: number;
  easing?: string;
  debounceMs?: number;
}

export const useSmoothTransitions = (config: TransitionConfig = {}) => {
  const {
    duration = 300,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
    debounceMs = 150,
  } = config;

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      setIsTransitioning(true);
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsTransitioning(false);
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [debounceMs]);

  const transitionStyles = {
    transition: `all ${duration}ms ${easing}`,
    willChange: isTransitioning ? 'transform, opacity, width, height' : 'auto',
  };

  const getTransitionClass = (baseClasses: string) => {
    return `${baseClasses} ${isTransitioning ? 'transition-all duration-300 ease-out' : ''}`;
  };

  return {
    isTransitioning,
    transitionStyles,
    getTransitionClass,
  };
};
