import React from "react";
import { FileX, Calendar, PlusCircle, Info, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyTimesheetStateProps {
  viewMode?: "today" | "week";
  onAddEntry?: () => void;
  variant?: "no-entries" | "no-projects";
}

const EmptyTimesheetState: React.FC<EmptyTimesheetStateProps> = ({
  viewMode = "week",
  onAddEntry,
  variant = "no-entries"
}) => {
  // Simple "no projects" variant
  if (variant === "no-projects") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 animate-in fade-in-50">
        <div className="p-4 bg-muted rounded-full">
          <FolderOpen className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">No projects found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Please create a project first to start tracking time.
          </p>
        </div>
      </div>
    );
  }

  // Default "no entries" variant with rich content
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
      <div className="p-4 bg-primary/10 rounded-full">
        <FileX className="h-12 w-12 text-primary" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {viewMode === "today"
            ? "No time entries for today"
            : "No time entries this week"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {viewMode === "today"
            ? "Start tracking your time by adding your first entry for today."
            : "You haven't logged any time entries this week. Add your first entry to start tracking."}
        </p>
      </div>

      {onAddEntry && (
        <Button onClick={onAddEntry} size="lg" className="mt-4 h-12">
          <PlusCircle className="h-5 w-5 mr-2" />
          Add First Entry
        </Button>
      )}

      <div className="flex items-start gap-3 text-xs text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg max-w-md mt-6">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
        <div className="text-left space-y-1">
          <p className="font-medium text-foreground">Quick Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tap "Add Time" to create an entry</li>
            <li>Swipe left on entries to delete</li>
            <li>Pull down to refresh your timesheet</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmptyTimesheetState;
