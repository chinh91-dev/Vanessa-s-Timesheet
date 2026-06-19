import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkingDaysDisplayProps {
  effectiveDays: number;
  effectiveHours: number;
  isAutoCalculated: boolean;
  calculationSource: 'full-time-default' | 'office-days' | 'template' | 'manual';
  isLoading?: boolean;
  effectiveDailySchedule?: Record<string, { working: boolean; location?: string }>;
  hasWeeklyOverride?: boolean;
}

const WorkingDaysDisplay: React.FC<WorkingDaysDisplayProps> = ({
  effectiveDays,
  effectiveHours,
  isAutoCalculated,
  calculationSource,
  isLoading = false,
  effectiveDailySchedule,
  hasWeeklyOverride
}) => {
  const getSourceLabel = () => {
    if (hasWeeklyOverride) {
      return 'Manual override';
    }
    
    switch (calculationSource) {
      case 'full-time-default':
        return 'Default (Full-time)';
      case 'office-days':
        return 'Auto-calculated from office days';
      case 'template':
        return 'Template';
      case 'manual':
        return 'Manual override';
      default:
        return 'Calculated';
    }
  };

  const getBadgeVariant = () => {
    if (hasWeeklyOverride) {
      return 'outline';
    }
    
    switch (calculationSource) {
      case 'full-time-default':
        return 'secondary';
      case 'office-days':
        return 'default';
      case 'template':
        return 'secondary';
      case 'manual':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Working Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Working Days
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-foreground">
            {effectiveDays}
          </div>
          <div className="text-sm text-muted-foreground">
            day{effectiveDays !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant={getBadgeVariant()} className="text-xs">
            {getSourceLabel()}
          </Badge>
          {isAutoCalculated && (
            <div className="text-xs text-muted-foreground">
              Read-only
            </div>
          )}
        </div>
        
        {calculationSource === 'office-days' && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Automatically calculated from selected office days
          </div>
        )}
        
        {calculationSource === 'full-time-default' && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Standard full-time schedule (5 days/week)
          </div>
        )}
        
        {calculationSource === 'template' && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Based on user's default work schedule template
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkingDaysDisplay;