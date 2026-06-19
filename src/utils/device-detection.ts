/**
 * Device Detection Utilities
 * Provides comprehensive device and capability detection for mobile-first features
 */

export interface DeviceInfo {
  // Device Type
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1024px
  isDesktop: boolean;     // > 1024px

  // Touch Capability
  hasTouch: boolean;      // Touch events supported
  isIOS: boolean;         // iOS device
  isAndroid: boolean;     // Android device

  // Viewport Details
  viewportWidth: number;
  viewportHeight: number;
  orientation: 'portrait' | 'landscape';

  // Safe Areas (for iOS notch)
  safeAreaTop: number;
  safeAreaBottom: number;

  // Performance
  reducedMotion: boolean; // prefers-reduced-motion
  connectionSpeed: 'slow' | 'medium' | 'fast';
}

/**
 * Detect device type and capabilities
 */
export const detectDevice = (): DeviceInfo => {
  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Connection speed detection
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  let connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium';

  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      connectionSpeed = 'slow';
    } else if (effectiveType === '4g') {
      connectionSpeed = 'fast';
    }
  }

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    viewportWidth: width,
    viewportHeight: height,
    orientation: width > height ? 'landscape' : 'portrait',
    safeAreaTop: getSafeAreaInset('top'),
    safeAreaBottom: getSafeAreaInset('bottom'),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    connectionSpeed,
  };
};

/**
 * Get CSS safe area insets (for iOS notch)
 */
export const getSafeAreaInset = (side: 'top' | 'bottom' | 'left' | 'right'): number => {
  if (typeof window === 'undefined') return 0;

  const computedStyle = getComputedStyle(document.documentElement);
  const value = computedStyle.getPropertyValue(`env(safe-area-inset-${side})`);

  if (!value) return 0;

  // Parse the value (could be in px, rem, etc.)
  const numericValue = parseInt(value, 10);
  return isNaN(numericValue) ? 0 : numericValue;
};

/**
 * Check if running in standalone mode (PWA)
 */
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

/**
 * Get device pixel ratio for high-DPI displays
 */
export const getPixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

/**
 * Check if browser supports specific features
 */
export const supportsFeature = {
  vibration: (): boolean => 'vibrate' in navigator,
  webp: async (): Promise<boolean> => {
    const img = new Image();
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    return new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  },
  intersectionObserver: (): boolean => 'IntersectionObserver' in window,
  serviceWorker: (): boolean => 'serviceWorker' in navigator,
};

/**
 * Throttle function for performance
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null;
  return function(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
