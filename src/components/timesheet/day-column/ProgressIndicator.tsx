
import React from "react";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  progress: number;
  color?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  progress,
  color = "bg-emerald-500" 
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1">
      <div 
        className={cn("h-full", color)} 
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default ProgressIndicator;
