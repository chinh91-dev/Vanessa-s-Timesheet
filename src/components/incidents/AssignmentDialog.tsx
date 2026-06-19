import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { User, Brain, Sparkles } from "lucide-react";
import { useProjectMembers } from "@/hooks/useIncidents";
import { SmartAssignmentDialog } from "./SmartAssignmentDialog";
import type { Incident } from "@/types/incident-types";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onAssign: (userId: string | null, reason?: string) => Promise<void>;
}

export function AssignmentDialog({ 
  open, 
  onOpenChange, 
  incident, 
  onAssign 
}: AssignmentDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useSmartAssignment, setUseSmartAssignment] = useState(false);
  const [smartDialogOpen, setSmartDialogOpen] = useState(false);

  const { data: projectMembers = [] } = useProjectMembers(incident.incident_project_id);
  const users = projectMembers.filter(m => m.user_type === 'employee');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const userIdToAssign = selectedUserId === "unassign" ? null : selectedUserId || null;
      await onAssign(userIdToAssign, reason.trim() || undefined);
      onOpenChange(false);
      setSelectedUserId("");
      setReason("");
    } catch (error) {
      console.error("Failed to assign incident:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setSelectedUserId("");
        setReason("");
        setUseSmartAssignment(false);
      }
    }
  };

  const handleSmartAssignment = () => {
    setSmartDialogOpen(true);
  };

  const currentAssigneeId = incident.assignee?.id;
  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Incident</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Smart Assignment Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <Label htmlFor="smart-assignment" className="text-sm font-medium">
                Use Smart Assignment
              </Label>
            </div>
            <Switch
              id="smart-assignment"
              checked={useSmartAssignment}
              onCheckedChange={setUseSmartAssignment}
            />
          </div>

          {useSmartAssignment ? (
            <div className="space-y-4">
              <div className="text-center p-6">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">Smart Assignment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Let AI analyze skills, workload, and availability to find the best assignee
                </p>
                <Button onClick={handleSmartAssignment} className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze & Assign
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Current Assignment</Label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              {incident.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {incident.assignee.full_name?.charAt(0) || incident.assignee.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {incident.assignee.full_name || incident.assignee.email}
                  </span>
                  {incident.auto_assigned && (
                    <Badge variant="secondary" className="text-xs">Auto</Badge>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Unassigned</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">New Assignee</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassign">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Unassign</span>
                  </div>
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.full_name || user.email}</span>
                      {user.id === currentAssigneeId && (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Assignment Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this incident being reassigned?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {selectedUserId && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                {selectedUserId === "unassign" ? (
                  "Incident will be unassigned"
                ) : selectedUser ? (
                  <>Incident will be assigned to <strong>{selectedUser.full_name || selectedUser.email}</strong></>
                ) : null}
              </p>
            </div>
           )}
            </>
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
            disabled={(!selectedUserId && !useSmartAssignment) || isSubmitting}
          >
            {isSubmitting ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Smart Assignment Dialog */}
      <SmartAssignmentDialog
        open={smartDialogOpen}
        onOpenChange={setSmartDialogOpen}
        incident={incident}
        onAssign={onAssign}
      />
    </Dialog>
  );
}