import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRescheduleMeeting } from "@/hooks/crm/useMeetings";
import type { CRMMeeting } from "@/lib/crm/types";

interface RescheduleDialogProps {
  meeting: CRMMeeting;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  meeting,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newStartTime, setNewStartTime] = useState(meeting.start_time.slice(0, 5));
  const [newEndTime, setNewEndTime] = useState(meeting.end_time?.slice(0, 5) || "");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const rescheduleMeeting = useRescheduleMeeting();

  const handleSubmit = () => {
    if (!newDate || !newStartTime) return;

    rescheduleMeeting.mutate(
      {
        id: meeting.id,
        newDate: format(newDate, "yyyy-MM-dd"),
        newStartTime,
        newEndTime: newEndTime || undefined,
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    setNewDate(undefined);
    setNewStartTime(meeting.start_time.slice(0, 5));
    setNewEndTime(meeting.end_time?.slice(0, 5) || "");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Meeting</DialogTitle>
          <DialogDescription>
            Select a new date and time for "{meeting.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="new-date">New Date *</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="new-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={(date) => {
                    setNewDate(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="new-start-time">New Start Time *</Label>
            <Input
              id="new-start-time"
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="new-end-time">New End Time</Label>
            <Input
              id="new-end-time"
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!newDate || !newStartTime || rescheduleMeeting.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", rescheduleMeeting.isPending && "animate-spin")} />
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleDialog;
