
import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="flex justify-center py-10">
      <div className="text-center animate-in fade-in-50">
        <div className="text-red-500">{error}</div>
        <Button 
          onClick={onRetry} 
          variant="outline"
          className="mt-4 hover:scale-105 transition-transform duration-200"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
};

export default ErrorState;
