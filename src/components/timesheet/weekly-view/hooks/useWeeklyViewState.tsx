
import { useState, useCallback } from "react";
import { TimesheetEntry } from "@/lib/timesheet-service";

export const useWeeklyViewState = () => {
  const [viewMode, setViewMode] = useState<"today" | "week">("week");
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  
  // Time entry dialog state
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Clear all dialog state
  const clearDialogState = useCallback(() => {
    setEntryDialogOpen(false);
    setSelectedDate(null);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(prevMode => prevMode === "today" ? "week" : "today");
  }, []);

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    lastUserId,
    setLastUserId,
    entryDialogOpen,
    setEntryDialogOpen,
    selectedDate,
    setSelectedDate,
    clearDialogState,
  };
};
