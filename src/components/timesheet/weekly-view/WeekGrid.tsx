
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import DayColumn from "../DayColumn";
import { TimesheetEntry, Project } from "@/lib/timesheet-service";
import { isWeekend } from "@/lib/date-utils";
import { useWeekValidation } from "@/hooks/useWeekValidation";
import { useAuth } from "@/context/AuthContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

interface WeekGridProps {
  weekDates: Date[];
  userId: string;
  entries: TimesheetEntry[];
  projects: Project[];
  onEntryChange: () => void;
  onDragEnd: (result: DropResult) => void;
  onAddEntry: (date: Date) => void;
  onEditEntry: (date: Date, entry: TimesheetEntry) => void;
  viewMode: "today" | "week";
  // New: Pre-computed effective daily hours to pass to DayColumn
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

const WeekGrid: React.FC<WeekGridProps> = ({
  weekDates,
  userId,
  entries,
  projects,
  onEntryChange,
  onDragEnd,
  onAddEntry,
  onEditEntry,
  viewMode,
  effectiveDailyHours,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Use batch validation for all week dates (replaces 14+ individual API calls with 3)
  const { 
    getDayStatus, 
    isDayBlocked,
    canCreateWeekendEntries,
    canCreateHolidayEntries,
    isAdmin,
  } = useWeekValidation(userId, weekDates);

  // Use the weekDates directly - the parent component already filters correctly
  const displayDates = weekDates;

  // Calculate dynamic grid columns based on number of visible days
  const getGridColumns = () => {
    if (viewMode === "today") return "grid-cols-1";

    const dayCount = displayDates.length;
    if (dayCount === 5) return "grid-cols-1 md:grid-cols-5"; // Weekdays only
    if (dayCount === 6) return "grid-cols-1 md:grid-cols-6"; // 6 days
    return "grid-cols-1 md:grid-cols-7"; // Full week
  };

  const renderDesktopView = () => (
    <div className={`grid gap-2 w-full overflow-hidden animate-in fade-in-50 ${getGridColumns()}`}>
      {displayDates.map((date, index) => {
        const isWeekendDay = isWeekend(date);
        const blockResult = isDayBlocked(date);
        const isWeekendBlocked = isWeekendDay && blockResult.isBlocked;

        return (
          <div
            key={date.toISOString()}
            className={`w-full min-w-0 max-w-full transition-all duration-200 ${isWeekendBlocked ? 'opacity-75' : ''
              }`}
          >
            <DayColumn
              date={date}
              userId={userId}
              entries={entries}
              projects={projects}
              onEntryChange={onEntryChange}
              droppableId={index.toString()}
              onAddEntry={() => onAddEntry(date)}
              onEditEntry={(entry) => onEditEntry(date, entry)}
              dayStatus={getDayStatus(date)}
              canCreateWeekendEntries={canCreateWeekendEntries}
              canCreateHolidayEntries={canCreateHolidayEntries}
              isAdmin={isAdmin}
              effectiveDailyHours={effectiveDailyHours}
            />
          </div>
        );
      })}
    </div>
  );

  const renderMobileView = () => (
    <Carousel className="w-full max-w-full animate-in fade-in-50">
      <CarouselContent>
        {displayDates.map((date, index) => {
          const isWeekendDay = isWeekend(date);
          const blockResult = isDayBlocked(date);
          const isWeekendBlocked = isWeekendDay && blockResult.isBlocked;

          return (
            <CarouselItem
              key={date.toISOString()}
              className={`basis-full min-w-0 transition-all duration-200 ${isWeekendBlocked ? 'opacity-75' : ''
                }`}
            >
              <DayColumn
                date={date}
                userId={userId}
                entries={entries}
                projects={projects}
                onEntryChange={onEntryChange}
                droppableId={index.toString()}
                onAddEntry={() => onAddEntry(date)}
                onEditEntry={(entry) => onEditEntry(date, entry)}
                dayStatus={getDayStatus(date)}
                canCreateWeekendEntries={canCreateWeekendEntries}
                canCreateHolidayEntries={canCreateHolidayEntries}
                isAdmin={isAdmin}
                effectiveDailyHours={effectiveDailyHours}
              />
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <div className="flex justify-center mt-2">
        <CarouselPrevious className="relative static mr-2 translate-y-0 translate-x-0 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" />
        <CarouselNext className="relative static ml-2 translate-y-0 translate-x-0 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" />
      </div>
    </Carousel>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {isMobile ? renderMobileView() : renderDesktopView()}
    </DragDropContext>
  );
};

export default WeekGrid;
