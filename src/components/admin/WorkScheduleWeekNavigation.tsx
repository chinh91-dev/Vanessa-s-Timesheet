
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { formatDateDisplay } from "@/lib/date-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkScheduleWeekNavigationProps {
  weekDates: Date[];
  navigateToPreviousWeek: () => void;
  navigateToNextWeek: () => void;
  navigateToCurrentWeek: () => void;
  error: string | null;
  fetchData: () => void;
}

const WorkScheduleWeekNavigation: React.FC<WorkScheduleWeekNavigationProps> = ({
  weekDates,
  navigateToPreviousWeek,
  navigateToNextWeek,
  navigateToCurrentWeek,
  error,
  fetchData,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={navigateToPreviousWeek}
                className="shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View previous week</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToCurrentWeek}
                className="shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                aria-label="Go to current week"
              >
                Current Week
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go to current week</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={navigateToNextWeek}
                className="shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View next week</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {error && (
          <Button 
            onClick={fetchData} 
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary animate-pulse"
            aria-label="Retry loading data"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Retry</span>
          </Button>
        )}
      </div>
      <div className="font-medium text-sm md:text-base">
        {weekDates.length > 0 && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary whitespace-nowrap">
            Week: {formatDateDisplay(weekDates[0])} - {formatDateDisplay(weekDates[weekDates.length - 1])}
          </span>
        )}
      </div>
    </div>
  );
};

export default WorkScheduleWeekNavigation;
