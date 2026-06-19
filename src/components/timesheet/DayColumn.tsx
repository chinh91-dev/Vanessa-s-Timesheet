
import React, { useState, useEffect } from "react";
import { formatDate, getWeekStart } from "@/lib/date-utils";
import { TimesheetEntry, Project, deleteTimesheetEntry } from "@/lib/timesheet-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSpecificDaysValidation } from "@/hooks/useSpecificDaysValidation";
import { isWeekend } from "@/lib/date-utils";
import { sortEntriesByTime } from "@/lib/time-sorting-utils";
import DayHeader from "./day-column/DayHeader";
import EntryList from "./day-column/EntryList";
import DeleteConfirmDialog from "./day-column/DeleteConfirmDialog";
import AddEntryButton from "./day-column/AddEntryButton";
import DayTotalHours from "./day-column/DayTotalHours";
import { WeekDayStatus } from "@/hooks/useWeekValidation";

interface DayColumnProps {
  date: Date;
  userId: string;
  entries: TimesheetEntry[];
  projects: Project[];
  onEntryChange: () => void;
  droppableId: string;
  onAddEntry: () => void;
  onEditEntry: (entry: TimesheetEntry) => void;
  // New: Pre-fetched day status from batch validation
  dayStatus?: WeekDayStatus;
  canCreateWeekendEntries?: boolean;
  canCreateHolidayEntries?: boolean;
  isAdmin?: boolean;
  // New: Pre-computed effective daily hours to avoid internal hook calls
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

const DayColumn: React.FC<DayColumnProps> = ({
  date,
  userId,
  entries,
  onEntryChange,
  droppableId,
  onAddEntry,
  onEditEntry,
  dayStatus,
  canCreateWeekendEntries = false,
  canCreateHolidayEntries = false,
  isAdmin = false,
  effectiveDailyHours,
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimesheetEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dailyTarget = 8;

  // Get working days validation - now uses pre-computed data from parent
  const weekStart = getWeekStart(date);
  const validation = useSpecificDaysValidation(
    userId, 
    entries, 
    weekStart,
    effectiveDailyHours,  // Pass pre-computed hours
    canCreateWeekendEntries  // Pass pre-computed permission
  );

  const formattedColumnDate = formatDate(date);

  // Filter entries for this day and sort by time
  const dayEntries = sortEntriesByTime(
    entries.filter(entry => {
      if (typeof entry.entry_date === 'string') {
        const entryDate = entry.entry_date.substring(0, 10);
        const matches = entryDate === formattedColumnDate;
        return matches;
      }
      return false;
    })
  );

  const totalHours = dayEntries.reduce(
    (sum, entry) => sum + entry.hours_logged,
    0
  );

  // Check if this day can accept new entries (specific days validation)
  const canAddToThisDay = validation.canAddToDate(date);
  const hasEntries = dayEntries.length > 0;

  // Derive blocked state from pre-fetched dayStatus
  const isHolidayDate = dayStatus?.isHoliday ?? false;
  const isOnLeave = dayStatus?.isOnLeave ?? false;
  const hasSpecificHolidayPermission = dayStatus?.hasSpecificHolidayPermission ?? false;

  // Calculate blocked states
  const isWeekendBlocked = (dayStatus?.isWeekend ?? isWeekend(date)) && !canCreateWeekendEntries && !isAdmin;
  const isHolidayBlocked = isHolidayDate && !canCreateHolidayEntries && !isAdmin && !hasSpecificHolidayPermission;
  const isLeaveBlocked = isOnLeave;

  const handleDeleteClick = (entry: TimesheetEntry) => {
    setEntryToDelete(entry);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete || !entryToDelete.id) return;

    try {
      setIsDeleting(true);
      await deleteTimesheetEntry(entryToDelete.id);
      toast({
        title: "Entry deleted",
        description: "Time entry deleted successfully.",
      });

      onEntryChange();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete time entry.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    }
  };

  // Enhanced add entry handler with validation
  const handleAddEntry = () => {
    // Check for leave block
    if (isLeaveBlocked) {
      toast({
        title: "On Leave",
        description: `You are on ${dayStatus?.leaveType || 'leave'} on this date.`,
        variant: "destructive",
      });
      return;
    }

    // Check for holiday block
    if (isHolidayBlocked) {
      toast({
        title: "Holiday Entry Blocked",
        description: `Holiday: ${dayStatus?.holidayName || 'Public holiday'}. Contact admin for permission.`,
        variant: "destructive",
      });
      return;
    }

    // Check for weekend block
    if (isWeekendBlocked) {
      toast({
        title: "Weekend Entry Blocked",
        description: "Weekend entries are not allowed. Contact your administrator for approval.",
        variant: "destructive",
      });
      return;
    }

    if (!canAddToThisDay) {
      toast({
        title: "Cannot add entry",
        description: validation.getValidationMessage(date),
        variant: "destructive",
      });
      return;
    }

    onAddEntry();
  };

  // Determine if day should be visually blocked
  const isDayBlocked = isLeaveBlocked || isHolidayBlocked || isWeekendBlocked || (!canAddToThisDay && !hasEntries);

  return (
    <div
      className={cn(
        "flex flex-col h-full border-2 rounded-lg overflow-hidden transition-all",
        // Use cleaner styling logic matching childcare app
        !canAddToThisDay && !hasEntries ? "bg-muted/30 border-muted" :
          isWeekendBlocked ? "bg-red-50 border-red-200" : "bg-card border-border",
        hasEntries && "ring-2 ring-primary/20"
      )}
    >
      <DayHeader 
        date={date} 
        entries={entries} 
        userId={userId}
        dayStatus={dayStatus}
        canCreateWeekendEntries={canCreateWeekendEntries}
        canCreateHolidayEntries={canCreateHolidayEntries}
        isAdmin={isAdmin}
      />

      <div className="h-full flex-grow overflow-hidden">
        <ScrollArea className="h-[50vh] md:h-[60vh]">
          <div className="flex flex-col p-2 space-y-2 min-w-0">
            <AddEntryButton
              onClick={handleAddEntry}
              disabled={isDayBlocked}
              className={cn(
                isDayBlocked && "opacity-50 cursor-not-allowed"
              )}
            />

            {/* Status messages for blocked days - Only showing critical status */}
            {!canAddToThisDay && !hasEntries && (
              <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded border border-muted">
                Day limit reached
              </div>
            )}

            <EntryList
              droppableId={droppableId}
              entries={dayEntries}
              onEditEntry={onEditEntry}
              onDeleteEntry={handleDeleteClick}
              onEntryChange={onEntryChange}
            />

            <DayTotalHours totalHours={totalHours} />
          </div>
        </ScrollArea>
      </div>

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default DayColumn;
