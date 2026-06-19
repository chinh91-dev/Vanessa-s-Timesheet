
import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Update the state initially
    setMatches(media.matches);
    
    // Define listener function
    const listener = () => setMatches(media.matches);
    
    // Add the listener to watch for changes
    media.addEventListener("change", listener);
    
    // Clean up
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

// Add useIsMobile hook that uses useMediaQuery with a mobile breakpoint
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}
