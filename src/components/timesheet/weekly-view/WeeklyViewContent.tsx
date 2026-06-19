
import React, { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { TimesheetEntry, Project } from "@/lib/timesheet-service";
import { getWeekStart, isWeekend } from "@/lib/date-utils";
import { useWeeklyWorkSchedule } from "@/hooks/useWeeklyWorkSchedule";
import { useWeekendLock } from "@/hooks/useWeekendLock";
import { useIsMobile } from "@/hooks/use-mobile";
import { LazyContent } from "@/components/common/LazyContent";
import WeeklyProgressBar from "./WeeklyProgressBar";
import WeeklyHoursSummary from "./WeeklyHoursSummary";
import MobileWeeklyHoursSummary from "./MobileWeeklyHoursSummary";
import WeekGrid from "./WeekGrid";
import EmptyTimesheetState from "./EmptyTimesheetState";
import { MobileTimesheetView } from "@/components/timesheet/mobile/MobileTimesheetView";

interface WeeklyViewContentProps {
  weekDates: Date[];
  currentDate: Date;
  viewMode: "today" | "week";
  entries: TimesheetEntry[];
  projects: Project[];
  onEntryChange: () => void;
  onAddEntry: (date: Date, entry?: TimesheetEntry) => void;
  onEditEntry: (date: Date, entry?: TimesheetEntry) => void;
  onDragEnd: (result: any) => void;
  viewAsUserId?: string | null;
}

const WeeklyViewContent: React.FC<WeeklyViewContentProps> = ({
  weekDates,
  currentDate,
  viewMode,
  entries,
  projects,
  onEntryChange,
  onAddEntry,
  onEditEntry,
  onDragEnd,
  viewAsUserId,
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Determine the effective user ID for schedule and weekend permissions
  const effectiveUserId = viewAsUserId || user?.id;

  // Get weekend permissions for the effective user
  const { shouldShowWeekendColumns } = useWeekendLock(effectiveUserId);

  // Get current week's schedule using the effective user ID
  const weekStartDate = getWeekStart(currentDate);
  const {
    effectiveDailyHours,
  } = useWeeklyWorkSchedule(effectiveUserId || "", weekStartDate);

  // Calculate effective working days from the schedule
  const effectiveDays = useMemo(() => {
    const hours = effectiveDailyHours;
    return (
      (hours.monday > 0 ? 1 : 0) +
      (hours.tuesday > 0 ? 1 : 0) +
      (hours.wednesday > 0 ? 1 : 0) +
      (hours.thursday > 0 ? 1 : 0) +
      (hours.friday > 0 ? 1 : 0) +
      (hours.saturday > 0 ? 1 : 0) +
      (hours.sunday > 0 ? 1 : 0)
    );
  }, [effectiveDailyHours]);

  // Calculate weekly target hours from the schedule
  const weeklyTarget = useMemo(() => {
    const hours = effectiveDailyHours;
    return (
      hours.monday +
      hours.tuesday +
      hours.wednesday +
      hours.thursday +
      hours.friday +
      hours.saturday +
      hours.sunday
    );
  }, [effectiveDailyHours]);

  // Determine which dates to display in the grid
  const displayDates = useMemo(() => {
    if (viewMode === "today") {
      return [currentDate];
    }

    // In week mode, filter out weekends based on shouldShowWeekendColumns
    if (!shouldShowWeekendColumns) {
      return weekDates.filter(date => !isWeekend(date));
    }

    return weekDates;
  }, [viewMode, currentDate, weekDates, shouldShowWeekendColumns]);

  // Calculate entries for totals and progress
  const calculationEntries = useMemo(() => {
    if (viewMode === "today") {
      const todayString = currentDate.toISOString().substring(0, 10);
      return entries.filter(entry => {
        const entryDateString = String(entry.entry_date).substring(0, 10);
        return entryDateString === todayString;
      });
    }

    // For week mode, use ALL entries from the week dates for calculations
    const weekDateStrings = weekDates.map(date => date.toISOString().substring(0, 10));
    return entries.filter(entry => {
      const entryDateString = String(entry.entry_date).substring(0, 10);
      return weekDateStrings.includes(entryDateString);
    });
  }, [entries, viewMode, currentDate, weekDates]);

  // Calculate total hours using all entries (including weekends)
  const totalHours = useMemo(() => {
    return calculationEntries.reduce((sum, entry) => {
      const hoursLogged = Number(entry.hours_logged) || 0;
      return sum + hoursLogged;
    }, 0);
  }, [calculationEntries]);

  // Calculate unique days worked using all entries (including weekends)
  const totalDaysWorked = useMemo(() => {
    const uniqueDatesWorked = new Set(
      calculationEntries.map(entry => {
        const entryDateString = String(entry.entry_date);
        return entryDateString.substring(0, 10);
      })
    );
    return uniqueDatesWorked.size;
  }, [calculationEntries]);

  // Calculate the target based on view mode and working days
  const workingDaysTarget = useMemo(() => {
    if (viewMode === "today") return 1;
    return effectiveDays;
  }, [viewMode, effectiveDays]);

  // Handle edit entry for mobile view
  const handleMobileEditEntry = (entry: TimesheetEntry) => {
    const entryDate = new Date(entry.entry_date);
    onEditEntry(entryDate, entry);
  };

  // Handle delete entry for mobile view
  const handleMobileDeleteEntry = async (entry: TimesheetEntry) => {
    // Trigger entry change after delete - actual delete handled by parent
    onEntryChange();
  };

  if (!user?.id) {
    return <div className="text-center text-muted-foreground">Please sign in to view your timesheet.</div>;
  }

  if (projects.length === 0) {
    return <EmptyTimesheetState variant="no-projects" />;
  }

  // Use enhanced MobileTimesheetView for mobile
  if (isMobile) {
    return (
      <MobileTimesheetView
        entries={entries}
        weekDates={weekDates}
        onEditEntry={handleMobileEditEntry}
        onDeleteEntry={handleMobileDeleteEntry}
        onEntryChange={onEntryChange}
        onAddEntry={onAddEntry}
        scheduledDailyHours={effectiveDailyHours}
        shouldShowWeekendColumns={shouldShowWeekendColumns}
      />
    );
  }

  return (
    <>
      {/* Hours Summary - use calculation entries for accurate totals */}
      {calculationEntries.length > 0 && (
        <LazyContent
          fallback={<div className="h-20 bg-muted rounded-lg animate-pulse" />}
          priority={true}
        >
          <WeeklyHoursSummary
            totalHours={totalHours}
            weeklyTarget={weeklyTarget}
            entries={entries}
          />
        </LazyContent>
      )}

      {/* Week/Day Grid - use filtered entries for display */}
      <LazyContent
        fallback={
          <div className={`grid gap-2 ${viewMode === "today" ? "grid-cols-1" : `grid-cols-1 md:grid-cols-${Math.min(displayDates.length, 7)}`}`}>
            {Array.from({ length: displayDates.length }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        }
        priority={true}
        className="w-full max-w-full overflow-hidden"
      >
        <WeekGrid
          weekDates={displayDates}
          userId={effectiveUserId || ""}
          entries={entries}
          projects={projects}
          onEntryChange={onEntryChange}
          onDragEnd={onDragEnd}
          onAddEntry={onAddEntry}
          onEditEntry={onEditEntry}
          viewMode={viewMode}
          effectiveDailyHours={effectiveDailyHours}
        />
      </LazyContent>

      {/* Progress Bar - use calculation entries for accurate progress */}
      {calculationEntries.length > 0 && (
        <LazyContent
          fallback={<div className="h-4 bg-muted rounded animate-pulse" />}
          priority={true}
        >
          <WeeklyProgressBar
            totalDaysWorked={totalDaysWorked}
            workingDaysTarget={workingDaysTarget}
          />
        </LazyContent>
      )}

      {/* Weekend Hidden Indicator */}
      {viewMode === "week" && !shouldShowWeekendColumns && (
        <div className="text-center text-sm text-muted-foreground mt-2">
          Weekend columns are hidden. Toggle weekend entries to show weekend days.
        </div>
      )}
    </>
  );
};

export default WeeklyViewContent;
