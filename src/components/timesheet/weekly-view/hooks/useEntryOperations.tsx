
import { useCallback } from "react";
import { DropResult } from "react-beautiful-dnd";
import { TimesheetEntry, saveTimesheetEntry } from "@/lib/timesheet-service";
import { formatDate } from "@/lib/date-utils";
import { toast } from "@/hooks/use-toast";
import { useTimesheetOptimization } from "@/hooks/useTimesheetOptimization";

export const useEntryOperations = (
  weekDates: Date[],
  entries: TimesheetEntry[],
  onEntriesChange: () => void,
  userId: string | undefined,
  updateEntryOptimistically?: (entry: TimesheetEntry, operation: 'create' | 'update' | 'delete') => { rollback: () => void } | undefined
) => {
  const { startTiming, endTiming } = useTimesheetOptimization();

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    if (!destination || !userId) return;
    
    const draggedEntry = entries.find(entry => entry.id === draggableId);
    if (!draggedEntry) return;
    
    const sourceDate = weekDates[parseInt(source.droppableId, 10)];
    const destDate = weekDates[parseInt(destination.droppableId, 10)];
    
    if (source.droppableId === destination.droppableId) return;
    
    try {
      startTiming('drag-entry');
      
      const updatedEntry: TimesheetEntry = {
        ...draggedEntry,
        entry_date: formatDate(destDate)
      };
      
      console.log("Updating entry in database:", {
        originalEntry: draggedEntry,
        updatedEntry: updatedEntry
      });

      // Perform optimistic update first
      const optimisticUpdate = updateEntryOptimistically?.(updatedEntry, 'update');
      
      try {
        const savedEntry = await saveTimesheetEntry(updatedEntry);
        console.log("Entry saved in database:", savedEntry);
        
        endTiming('drag-entry');
        
        toast({
          title: "Entry moved",
          description: `Entry moved to ${formatDate(destDate)}`,
        });
        
        // Only refresh if no optimistic update was performed
        if (!optimisticUpdate) {
          onEntriesChange();
        }
      } catch (saveError) {
        // Rollback optimistic update on error
        optimisticUpdate?.rollback();
        throw saveError;
      }
    } catch (error) {
      console.error("Failed to update entry date:", error);
      toast({
        title: "Error",
        description: "Failed to move entry. Please try again.",
        variant: "destructive",
      });
    }
  }, [weekDates, entries, onEntriesChange, userId, updateEntryOptimistically, startTiming, endTiming]);

  return {
    handleDragEnd,
  };
};
