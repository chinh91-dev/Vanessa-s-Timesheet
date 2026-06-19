import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { INCIDENT_STATUS_FLOW } from "@/types/incident-types";
import { TimeLoggerInput, useTimeLoggerState } from "@/components/shared/TimeLoggerInput";
import { useQuickTimeEntry } from "@/hooks/useQuickTimeEntry";
import type { Incident, IncidentStatus } from "@/types/incident-types";

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onStatusChange: (newStatus: IncidentStatus, comment?: string) => Promise<void>;
}

export function StatusTransitionDialog({ 
  open, 
  onOpenChange, 
  incident, 
  onStatusChange 
}: StatusTransitionDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | "">("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLogData, setTimeLogData] = useTimeLoggerState();
  
  const { createFromIncident } = useQuickTimeEntry();

  const allowedTransitions = INCIDENT_STATUS_FLOW[incident.status] || [];

  const handleSubmit = async () => {
    if (!selectedStatus || selectedStatus === incident.status) return;

    setIsSubmitting(true);
    try {
      await onStatusChange(selectedStatus, comment.trim() || undefined);
      
      // Log time if enabled
      if (timeLogData.enabled && timeLogData.hours > 0) {
        await createFromIncident.mutateAsync({
          incidentId: incident.id,
          hours: timeLogData.hours,
          notes: comment.trim() || `Status changed to ${selectedStatus}`,
          startTime: timeLogData.mode === "timeframe" ? timeLogData.startTime : undefined,
          endTime: timeLogData.mode === "timeframe" ? timeLogData.endTime : undefined,
        });
      }
      
      onOpenChange(false);
      setSelectedStatus("");
      setComment("");
      setTimeLogData({ enabled: false, mode: "duration", hours: 0, startTime: "", endTime: "" });
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setSelectedStatus("");
        setComment("");
        setTimeLogData({ enabled: false, mode: "duration", hours: 0, startTime: "", endTime: "" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Incident Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="flex items-center gap-2">
              <StatusBadge status={incident.status} />
              <span className="text-sm text-muted-foreground">
                Incident #{incident.incident_number}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">New Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as IncidentStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {allowedTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Add a comment about this status change..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <TimeLoggerInput
            value={timeLogData}
            onChange={setTimeLogData}
            disabled={isSubmitting}
          />

          {selectedStatus && selectedStatus !== incident.status && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Status will change from <StatusBadge status={incident.status} className="mx-1" /> 
                to <StatusBadge status={selectedStatus} className="mx-1" />
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={!selectedStatus || selectedStatus === incident.status || isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}