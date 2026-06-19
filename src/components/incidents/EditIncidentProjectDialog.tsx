import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IncidentProject } from "@/types/incident-types";
import { ProjectSettingsForm } from "./ProjectSettingsForm";

interface EditIncidentProjectDialogProps {
  project: IncidentProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIncidentProjectDialog({ project, open, onOpenChange }: EditIncidentProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project details below.
          </DialogDescription>
        </DialogHeader>
        <ProjectSettingsForm 
          project={project} 
          onSuccess={() => onOpenChange(false)}
          showCancelButton
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}