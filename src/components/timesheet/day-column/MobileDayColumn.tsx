import React, { useState, useLayoutEffect } from "react";
import { formatDate, getWeekStart } from "@/lib/date-utils";
import { TimesheetEntry, Project, deleteTimesheetEntry } from "@/lib/timesheet-service";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSpecificDaysValidation } from "@/hooks/useSpecificDaysValidation";
import { isWeekend } from "@/lib/date-utils";
import { sortEntriesByTime } from "@/lib/time-sorting-utils";
import DayHeader from "./DayHeader";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import MobileEntryCard from "../entry-card/MobileEntryCard";
import { WeekDayStatus } from "@/hooks/useWeekValidation";

interface MobileDayColumnProps {
  date: Date;
  userId: string;
  entries: TimesheetEntry[];
  projects: Project[];
  onEntryChange: () => void;
  onAddEntry: () => void;
  onEditEntry: (entry: TimesheetEntry) => void;
  // Pre-fetched day status from batch validation
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

const MobileDayColumn: React.FC<MobileDayColumnProps> = ({
  date,
  userId,
  entries,
  projects,
  onEntryChange,
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
  const [scrollHeight, setScrollHeight] = useState('420px');
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
        return entryDate === formattedColumnDate;
      }
      return false;
    })
  );

  const totalHours = dayEntries.reduce(
    (sum, entry) => sum + entry.hours_logged,
    0
  );

  const dayProgress = Math.min((totalHours / dailyTarget) * 100, 100);

  const getProgressColor = () => {
    if (dayProgress < 30) return "bg-amber-500";
    if (dayProgress < 70) return "bg-blue-500";
    if (dayProgress < 100) return "bg-emerald-500";
    return "bg-violet-500";
  };

  // Check if this day can accept new entries
  const canAddToThisDay = validation.canAddToDate(date);
  const hasEntries = dayEntries.length > 0;
  
  // Use pre-fetched status or derive basic info
  const isWeekendDay = dayStatus?.isWeekend ?? isWeekend(date);
  const isHolidayDate = dayStatus?.isHoliday ?? false;
  const isOnLeave = dayStatus?.isOnLeave ?? false;
  const hasSpecificHolidayPermission = dayStatus?.hasSpecificHolidayPermission ?? false;

  // Derive blocked states from pre-fetched dayStatus
  const isWeekendBlocked = isWeekendDay && !canCreateWeekendEntries && !isAdmin;
  const isHolidayBlocked = isHolidayDate && !canCreateHolidayEntries && !isAdmin && !hasSpecificHolidayPermission;
  const isLeaveBlocked = isOnLeave;

  // Calculate dynamic scroll height based on viewport
  useLayoutEffect(() => {
    const calculateHeight = () => {
      // Account for:
      // - Mobile navigation card (~110px from MobileWeekNavigation)
      // - Weekly summary card (~180px from MobileWeeklyHoursSummary)
      // - Day header (~60px from DayHeader)
      // - Add entry button + status messages (~120px)
      // - Safe area padding (~50px for mobile bottom chrome)
      const totalOffset = 520;
      const calculatedHeight = window.innerHeight - totalOffset;
      setScrollHeight(`${Math.max(calculatedHeight, 200)}px`);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

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

  const isDayBlocked = (!canAddToThisDay && !hasEntries) || (isWeekendBlocked && !hasEntries) || (isHolidayBlocked && !hasEntries) || (isLeaveBlocked && !hasEntries);

  return (
    <Card className={cn(
      "h-full shadow-sm transition-all duration-200",
      isDayBlocked && "bg-muted border-dashed opacity-75",
      isLeaveBlocked && !hasEntries && "bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800 border-dashed",
      isHolidayBlocked && !hasEntries && "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 border-dashed",
      isWeekendBlocked && !hasEntries && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 border-dashed",
      isWeekendDay && !isWeekendBlocked && "bg-blue-50 dark:bg-blue-950",
      isHolidayDate && !isHolidayBlocked && "bg-orange-50 dark:bg-orange-950",
      isOnLeave && !isLeaveBlocked && "bg-teal-50 dark:bg-teal-950"
    )}>
      <CardContent className="p-0">
        <DayHeader 
          date={date} 
          entries={entries} 
          userId={userId}
          dayStatus={dayStatus}
          canCreateWeekendEntries={canCreateWeekendEntries}
          canCreateHolidayEntries={canCreateHolidayEntries}
          isAdmin={isAdmin}
        />
        
        {/* Progress Bar */}
        {totalHours > 0 && (
          <div className="px-3 pb-2">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${dayProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {totalHours.toFixed(2)}h / {dailyTarget}h
            </p>
          </div>
        )}

        {/* Add Entry Button */}
        <div className="px-3 pb-3">
          <Button
            onClick={handleAddEntry}
            disabled={isDayBlocked}
            variant="outline"
            size="lg"
            className={cn(
              "w-full h-12 border-dashed hover:border-solid transition-all duration-200",
              isDayBlocked && "opacity-50 cursor-not-allowed",
              !isDayBlocked && "hover:bg-primary/5 hover:border-primary"
            )}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Time
          </Button>
        </div>

        {/* Status Messages */}
        {!canAddToThisDay && !hasEntries && !isLeaveBlocked && (
          <div className="px-3 pb-3">
            <div className="text-xs text-center p-2 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              Day limit reached
            </div>
          </div>
        )}

        {isLeaveBlocked && !hasEntries && (
          <div className="px-3 pb-3">
            <div className="text-xs text-center p-2 bg-teal-50 dark:bg-teal-950 rounded border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
              {dayStatus?.leaveType ? `On Leave: ${dayStatus.leaveType}` : "On approved leave"}
            </div>
          </div>
        )}

        {isHolidayBlocked && !hasEntries && !isLeaveBlocked && (
          <div className="px-3 pb-3">
            <div className="text-xs text-center p-2 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200">
              {dayStatus?.holidayName ? `Holiday: ${dayStatus.holidayName}` : "Holiday entries disabled"}
            </div>
          </div>
        )}

        {isWeekendBlocked && !hasEntries && !isLeaveBlocked && (
          <div className="px-3 pb-3">
            <div className="text-xs text-center p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
              Weekend entries disabled
            </div>
          </div>
        )}

        {isWeekendDay && !isWeekendBlocked && !hasEntries && !isLeaveBlocked && (
          <div className="px-3 pb-3">
            <div className="text-xs text-center p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
              Weekend day
            </div>
          </div>
        )}

        {isHolidayDate && !isHolidayBlocked && !hasEntries && !isLeaveBlocked && (
          <div className="px-3 pb-3">
            <div className="text-xs text-center p-2 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200">
              {dayStatus?.holidayName ? `Holiday: ${dayStatus.holidayName}` : "Holiday day"}
            </div>
          </div>
        )}

        {/* Entries - now sorted by time */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: scrollHeight }}>
          <div className="px-3 pb-3 space-y-2">
            {dayEntries.length === 0 && !isDayBlocked ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No entries yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Tap "Add Time" to start</p>
              </div>
            ) : (
              dayEntries.map((entry) => (
                <MobileEntryCard
                  key={entry.id}
                  entry={entry}
                  onEditEntry={onEditEntry}
                  onDeleteEntry={handleDeleteClick}
                  onEntryChange={onEntryChange}
                />
              ))
            )}
          </div>
        </div>
      </CardContent>
      
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </Card>
  );
};

export default MobileDayColumn;
