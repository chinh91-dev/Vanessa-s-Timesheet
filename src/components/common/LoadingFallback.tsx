import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface LoadingFallbackProps {
  message?: string;
  delay?: number;
}

/**
 * Loading fallback component for lazy-loaded routes
 * Includes a delay to prevent flash for fast loads
 */
export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = "Loading...",
  delay = 300
}) => {
  const [showLoader, setShowLoader] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setShowLoader(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Don't render anything during delay period
  if (!showLoader) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="space-y-4 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default LoadingFallback;
