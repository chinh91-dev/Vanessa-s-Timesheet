import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TimeLoggerInput, useTimeLoggerState } from "@/components/shared/TimeLoggerInput";
import { useQuickTimeEntry } from "@/hooks/useQuickTimeEntry";

// Hardcoded Sales Activity Project ID
const SALES_ACTIVITY_PROJECT_ID = "55e53bc6-605d-47d9-a290-cbe3161a6774";

interface CRMTimeEntryDialogProps {
  open: boolean;
  onClose: () => void;
  activityType: "deal" | "meeting" | "task";
  activityTitle: string;
  activityId: string;
  onTimeLogged?: () => void;
}

export function CRMTimeEntryDialog({
  open,
  onClose,
  activityType,
  activityTitle,
  activityId,
  onTimeLogged,
}: CRMTimeEntryDialogProps) {
  const [timeLogData, setTimeLogData] = useTimeLoggerState(true); // Start with enabled
  const [notes, setNotes] = useState("");
  const { createFromTask } = useQuickTimeEntry();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setNotes("");
      setTimeLogData({
        enabled: true,
        mode: "duration",
        hours: 0,
        startTime: "",
        endTime: "",
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (timeLogData.hours <= 0) {
      // Just close without logging if no time entered
      onClose();
      return;
    }

    await createFromTask.mutateAsync({
      taskId: activityId,
      taskTitle: activityTitle,
      hours: timeLogData.hours,
      notes: notes || activityTitle,
      projectId: SALES_ACTIVITY_PROJECT_ID,
      startTime: timeLogData.mode === "timeframe" ? timeLogData.startTime : undefined,
      endTime: timeLogData.mode === "timeframe" ? timeLogData.endTime : undefined,
    });
    
    onTimeLogged?.();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  const getActivityLabel = () => {
    switch (activityType) {
      case "deal":
        return "Deal Movement";
      case "meeting":
        return "Meeting";
      case "task":
        return "Task";
      default:
        return "Activity";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Log Time - Sales Activity
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{getActivityLabel()}</p>
            <p className="text-sm font-medium">{activityTitle}</p>
          </div>

          <TimeLoggerInput
            value={timeLogData}
            onChange={setTimeLogData}
            disabled={createFromTask.isPending}
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this activity..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip} disabled={createFromTask.isPending}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createFromTask.isPending || timeLogData.hours <= 0}
          >
            {createFromTask.isPending ? "Logging..." : "Log Time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CRMTimeEntryDialog;
