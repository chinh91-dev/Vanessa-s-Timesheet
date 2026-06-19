
import React from "react";
import { TimesheetEntry, Project } from "@/lib/timesheet-service";
import { Contract } from "@/lib/contract-service";
import TimeEntryDialog from "../TimeEntryDialog";

interface WeeklyViewDialogsProps {
  userId: string;
  selectedDate: Date | null;
  entryDialogOpen: boolean;
  setEntryDialogOpen: (open: boolean) => void;
  projects: Project[];
  contracts: Contract[];
  editingEntry: TimesheetEntry | undefined;
  onSave: (savedEntry?: TimesheetEntry) => void;
  entries: TimesheetEntry[];
}

const WeeklyViewDialogs: React.FC<WeeklyViewDialogsProps> = ({
  userId,
  selectedDate,
  entryDialogOpen,
  setEntryDialogOpen,
  projects,
  contracts,
  editingEntry,
  onSave,
  entries,
}) => {
  if (!selectedDate) return null;

  return (
    <TimeEntryDialog
      open={entryDialogOpen}
      onOpenChange={setEntryDialogOpen}
      userId={userId}
      date={selectedDate}
      projects={projects}
      contracts={contracts}
      existingEntry={editingEntry}
      onSave={onSave}
      entries={entries}
    />
  );
};

export default WeeklyViewDialogs;
