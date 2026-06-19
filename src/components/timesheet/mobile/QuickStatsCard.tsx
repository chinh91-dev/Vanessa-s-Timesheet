import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QuickStatsCardProps {
  totalHours: number;
  targetHours: number;
  daysWorked: number;
  targetDays: number;
  className?: string;
}

export const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  totalHours,
  targetHours,
  daysWorked,
  targetDays,
  className,
}) => {
  const percentage = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;

  const getStatusColor = () => {
    if (percentage >= 90 && percentage <= 110) return 'bg-green-500';
    if (percentage > 110) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusIcon = () => {
    if (percentage > 100) return <TrendingUp className="h-4 w-4 text-orange-500" />;
    if (percentage >= 90) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (percentage < 50) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (percentage > 110) return 'Overtime';
    if (percentage >= 90) return 'On Track';
    if (percentage >= 50) return 'In Progress';
    return 'Behind';
  };

  return (
    <Card className={cn(
      "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20",
      className
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Hours & Days Row */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{totalHours.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">h</span>
            </div>
            <p className="text-xs text-muted-foreground">of {targetHours}h target</p>
          </div>

          <div className="text-right">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-lg font-semibold text-foreground">{daysWorked}</span>
              <span className="text-sm text-muted-foreground">/ {targetDays}</span>
            </div>
            <p className="text-xs text-muted-foreground">days worked</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <span className="font-medium text-foreground">{getStatusText()}</span>
            </div>
            <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-500 ease-out",
                getStatusColor()
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
            {percentage > 100 && (
              <div
                className="h-2 bg-orange-500/50 rounded-full -mt-2"
                style={{ width: `${Math.min(percentage - 100, 50)}%`, marginLeft: '100%' }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickStatsCard;
