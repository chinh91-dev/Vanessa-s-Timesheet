import { useMediaQuery } from "./use-mobile";

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  breakpoint: Breakpoint;
}

export function useResponsive(): ResponsiveState {
  // Breakpoint definitions
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Touch capability detection
  // Checks for coarse pointer (touchscreen) and no hover capability (mobile devices)
  const isTouchDevice = useMediaQuery("(hover: none) and (pointer: coarse)");

  // Determine current breakpoint
  const breakpoint: Breakpoint = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    breakpoint
  };
}
