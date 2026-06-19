
import React from "react";
import { Progress } from "@/components/ui/progress";

interface WeeklyProgressBarProps {
  totalDaysWorked: number;
  workingDaysTarget: number;
}

const WeeklyProgressBar: React.FC<WeeklyProgressBarProps> = ({ 
  totalDaysWorked, 
  workingDaysTarget 
}) => {
  const dayProgress = workingDaysTarget > 0 ? Math.min((totalDaysWorked / workingDaysTarget) * 100, 100) : 0;
  
  const getProgressColor = () => {
    if (dayProgress < 30) return "bg-amber-500";
    if (dayProgress < 70) return "bg-blue-500";
    if (dayProgress < 100) return "bg-emerald-500";
    return "bg-violet-500"; // Over 100%
  };

  return (
    <div className="mt-4 space-y-2 animate-in fade-in-50 duration-300">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">
          Weekly Progress: {totalDaysWorked}/{workingDaysTarget} days
        </span>
        <span className="text-sm font-medium">{dayProgress.toFixed(0)}%</span>
      </div>
      <Progress 
        value={dayProgress} 
        className="h-2" 
        indicatorClassName={getProgressColor()} 
      />
    </div>
  );
};

export default WeeklyProgressBar;
