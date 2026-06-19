
import React, { useState, useEffect } from "react";
import { TimesheetEntry, Project } from "@/lib/timesheet-service";
import MobileDayColumn from "../day-column/MobileDayColumn";
import { MobileDayColumnSkeleton } from "../day-column/MobileDayColumnSkeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useWeekValidation, WeekDayStatus } from "@/hooks/useWeekValidation";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/date-utils";

interface MobileWeekGridProps {
  weekDates: Date[];
  userId: string;
  entries: TimesheetEntry[];
  projects: Project[];
  onEntryChange: () => void;
  onAddEntry: (date: Date) => void;
  onEditEntry: (date: Date, entry: TimesheetEntry) => void;
  viewMode: "today" | "week";
  isLoading?: boolean;
  // New: Pre-computed effective daily hours to pass to MobileDayColumn
  effectiveDailyHours?: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
}

const MobileWeekGrid: React.FC<MobileWeekGridProps> = ({
  weekDates,
  userId,
  entries,
  projects,
  onEntryChange,
  onAddEntry,
  onEditEntry,
  viewMode,
  isLoading = false,
  effectiveDailyHours,
}) => {
  // Carousel state tracking
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Use batch validation hook for all days at once
  const { getDayStatus, canCreateWeekendEntries, canCreateHolidayEntries, isAdmin } = useWeekValidation(userId, weekDates);

  // Subscribe to carousel selection events
  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      setSelectedIndex(carouselApi.selectedScrollSnap());
    };

    carouselApi.on('select', onSelect);
    onSelect(); // Set initial state

    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  // Use the weekDates directly - the parent component already filters correctly
  // In day mode, weekDates will contain only the selected date
  // In week mode, weekDates will contain the visible days (filtered by parent)
  const displayDates = weekDates;

  // Show skeleton loading state
  if (isLoading) {
    return (
      <div className="w-full">
        {viewMode === "today" ? (
          <MobileDayColumnSkeleton />
        ) : (
          <Carousel className="w-full">
            <CarouselContent className="ml-0 pl-4">
              {displayDates.map((_, index) => (
                <CarouselItem key={index} className="pl-0 pr-4 basis-full min-w-0">
                  <MobileDayColumnSkeleton />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </div>
    );
  }

  if (viewMode === "today") {
    // Single day view for day mode
    return (
      <div className="w-full animate-in fade-in-50">
        {displayDates.map((date) => (
          <MobileDayColumn
            key={date.toISOString()}
            date={date}
            userId={userId}
            entries={entries}
            projects={projects}
            onEntryChange={onEntryChange}
            onAddEntry={() => onAddEntry(date)}
            onEditEntry={(entry) => onEditEntry(date, entry)}
            dayStatus={getDayStatus(date)}
            canCreateWeekendEntries={canCreateWeekendEntries}
            canCreateHolidayEntries={canCreateHolidayEntries}
            isAdmin={isAdmin}
            effectiveDailyHours={effectiveDailyHours}
          />
        ))}
      </div>
    );
  }

  // Carousel view for week mode
  return (
    <div className="w-full animate-in fade-in-50">
      <Carousel setApi={setCarouselApi} className="w-full">
        <CarouselContent className="ml-0 pl-4">
          {displayDates.map((date) => (
            <CarouselItem 
              key={date.toISOString()} 
              className="pl-0 pr-4 basis-full min-w-0"
            >
              <MobileDayColumn
                date={date}
                userId={userId}
                entries={entries}
                projects={projects}
                onEntryChange={onEntryChange}
                onAddEntry={() => onAddEntry(date)}
                onEditEntry={(entry) => onEditEntry(date, entry)}
                dayStatus={getDayStatus(date)}
                canCreateWeekendEntries={canCreateWeekendEntries}
                canCreateHolidayEntries={canCreateHolidayEntries}
                isAdmin={isAdmin}
                effectiveDailyHours={effectiveDailyHours}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Navigation Controls */}
        <div className="flex justify-center items-center mt-6 space-x-4">
          <CarouselPrevious className="relative static translate-y-0 translate-x-0 h-12 w-12 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" />
          
          {/* Day Indicator - dynamic based on visible days with active state */}
          <div className="flex space-x-1">
            {displayDates.map((date, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === selectedIndex
                    ? "bg-primary w-4"
                    : "bg-gray-300"
                )}
              />
            ))}
          </div>
          
          <CarouselNext className="relative static translate-y-0 translate-x-0 h-12 w-12 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" />
        </div>
      </Carousel>
    </div>
  );
};

export default MobileWeekGrid;
