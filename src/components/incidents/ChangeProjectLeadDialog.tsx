import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateIncidentProject, useAssignableUsers } from "@/hooks/useIncidents";
import type { IncidentProject } from "@/types/incident-types";

interface ChangeProjectLeadDialogProps {
  project: IncidentProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeProjectLeadDialog({ project, open, onOpenChange }: ChangeProjectLeadDialogProps) {
  const [selectedLeadId, setSelectedLeadId] = useState(project.lead_id || "");
  const updateProject = useUpdateIncidentProject();
  const { data: users } = useAssignableUsers();

  const handleSubmit = async () => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        updates: {
          lead_id: selectedLeadId || undefined,
        }
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating project lead:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Project Lead</DialogTitle>
          <DialogDescription>
            Select a new project lead for {project.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Project Lead</label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a project lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Lead</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={updateProject.isPending}
            >
              {updateProject.isPending ? "Updating..." : "Update Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}