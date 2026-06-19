
// Session cleanup utility
export const cleanupAuthState = () => {
  // Clear all auth-related data from localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage as well
  Object.keys(sessionStorage || {}).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log("Auth state cleaned up");
};

// Session validation helper
export const validateSession = (currentSession: any) => {
  if (!currentSession?.user?.id) {
    console.log("Session validation failed: No valid user ID");
    return false;
  }
  
  console.log(`Session validated for user: ${currentSession.user.id} (${currentSession.user.email})`);
  return true;
};
