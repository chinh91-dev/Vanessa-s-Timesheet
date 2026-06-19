
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to manage authentication redirect logic
 * Saves the current path when user needs to authenticate
 * and clears it when appropriate
 */
export const useAuthRedirect = () => {
  const location = useLocation();

  // Save current path as intended destination (except for auth page).
  // Only persist values that look like internal app paths to defuse
  // open-redirect classes (no schemes, no protocol-relative URLs).
  const isSafeInternalPath = (path: string): boolean => {
    if (typeof path !== 'string' || path.length === 0) return false;
    if (!path.startsWith('/')) return false;
    if (path.startsWith('//')) return false; // protocol-relative
    if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) return false; // /javascript:, etc.
    return true;
  };

  const saveIntendedPath = (path: string) => {
    if (!isSafeInternalPath(path)) return;
    if (path !== '/auth') {
      try {
        localStorage.setItem('intended_path', path);
      } catch (e) {
        console.warn('[useAuthRedirect] localStorage write failed:', e);
      }
      console.log(`Saved intended path: ${path}`);
    }
  };

  // Get the intended path for redirect after authentication
  const getIntendedPath = (): string => {
    let intendedPath: string | null = null;
    try {
      intendedPath = localStorage.getItem('intended_path');
    } catch (e) {
      console.warn('[useAuthRedirect] localStorage read failed:', e);
    }

    // Default fallback to /timesheet if no intended path or value looks
    // unsafe (storage tampering, legacy bad value).
    if (!intendedPath || intendedPath === '/auth' || !isSafeInternalPath(intendedPath)) {
      return '/timesheet';
    }

    return intendedPath;
  };

  // Clear the intended path after successful redirect
  const clearIntendedPath = () => {
    localStorage.removeItem('intended_path');
    console.log('Cleared intended path');
  };

  return {
    saveIntendedPath,
    getIntendedPath,
    clearIntendedPath,
    currentPath: location.pathname
  };
};
