
/**
 * Utility functions for debugging routing and authentication flows
 */

export const logRoutingEvent = (event: string, details: any = {}) => {
  console.log(`[ROUTING] ${event}:`, details);
};

export const logAuthEvent = (event: string, details: any = {}) => {
  console.log(`[AUTH] ${event}:`, details);
};

export const getCurrentState = () => {
  const intendedPath = localStorage.getItem('intended_path');
  const currentPath = window.location.pathname;
  
  return {
    currentPath,
    intendedPath,
    timestamp: new Date().toISOString()
  };
};
