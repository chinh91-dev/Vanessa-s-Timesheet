
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, CalendarDays } from "lucide-react";
import { formatDateDisplay, getWeekStart } from "@/lib/date-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface WeekNavigationProps {
  weekDates: Date[];
  currentDate: Date;
  navigateToPrevious: () => void;
  navigateToNext: () => void;
  navigateToCurrentWeek: () => void;
  error: string | null;
  fetchData: () => void;
  viewMode: "today" | "week";
  toggleViewMode: () => void;
}

const WeekNavigation: React.FC<WeekNavigationProps> = ({
  weekDates,
  currentDate,
  navigateToPrevious,
  navigateToNext,
  navigateToCurrentWeek,
  error,
  fetchData,
  viewMode,
  toggleViewMode,
}) => {
  const isMobile = useIsMobile();
  const isWeekMode = viewMode === "week";
  const navigationLabel = isWeekMode ? "week" : "day";

  // Date display text
  const dateDisplayText = useMemo(() => {
    if (weekDates.length === 0) return "";
    return viewMode === "today"
      ? formatDateDisplay(currentDate)
      : `${formatDateDisplay(weekDates[0])} - ${formatDateDisplay(weekDates[weekDates.length - 1])}`;
  }, [weekDates, currentDate, viewMode]);

  // Mobile layout
  if (isMobile) {
    return (
      <Card className="mb-4 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          {/* Date Display */}
          <div className="text-center mb-4">
            <div className="text-lg font-semibold text-primary">
              {dateDisplayText}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={navigateToPrevious}
              className="flex-1 h-12 shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
              aria-label={`Previous ${navigationLabel}`}
            >
              <ChevronLeft className="h-5 w-5 mr-1 flex-shrink-0" />
              <span className="truncate">Prev</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={navigateToNext}
              className="flex-1 h-12 shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
              aria-label={`Next ${navigationLabel}`}
            >
              <span className="truncate">Next</span>
              <ChevronRight className="h-5 w-5 ml-1 flex-shrink-0" />
            </Button>
          </div>

          {/* Error Retry */}
          {error && (
            <div className="mt-4">
              <Button
                onClick={fetchData}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-primary"
                aria-label="Retry loading data"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={navigateToPrevious}
                className="shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                aria-label={`Previous ${navigationLabel}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View previous {navigationLabel}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleViewMode}
                className="shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center gap-1"
                aria-label="Toggle view mode"
              >
                {viewMode === "today" ? (
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <CalendarDays className="h-3.5 w-3.5 mr-1" />
                )}
                <span>{viewMode === "today" ? "Day" : "Week"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to {viewMode === "today" ? "week" : "day"} view</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={navigateToNext}
                className="shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                aria-label={`Next ${navigationLabel}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View next {navigationLabel}</p>
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
        {dateDisplayText && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary whitespace-nowrap">
            {dateDisplayText}
          </span>
        )}
      </div>
    </div>
  );
};

export default WeekNavigation;
