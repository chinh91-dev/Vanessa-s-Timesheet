
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Project } from "@/lib/timesheet/types";
import AddEditProjectForm from "./AddEditProjectForm";

interface AddEditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingProject?: Project | null;
}

const AddEditProjectDialog = ({
  isOpen,
  onClose,
  existingProject,
}: AddEditProjectDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingProject ? "Edit Project" : "Add New Project"}
          </DialogTitle>
          <DialogDescription>
            {existingProject
              ? "Update the project details below."
              : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>
        
        <AddEditProjectForm
          existingProject={existingProject}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddEditProjectDialog;
