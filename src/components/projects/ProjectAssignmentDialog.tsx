
import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Project } from "@/lib/timesheet/types";
import {
  fetchProjectAssignments,
  bulkAssignUsersToProject,
  removeUserFromProject,
} from "@/lib/project/assignment-service";
import { ProjectAssignment } from "@/lib/project/assignment-types";
import ProjectAssigneeSelector from "./ProjectAssigneeSelector";

interface ProjectAssignmentDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

const ProjectAssignmentDialog: React.FC<ProjectAssignmentDialogProps> = ({
  project,
  open,
  onOpenChange,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Fetch current assignments for this project
  const { data: assignments = [] } = useQuery({
    queryKey: ["project-assignments", project?.id],
    queryFn: () => project ? fetchProjectAssignments(project.id) : Promise.resolve([]),
    enabled: !!project && open,
  });

  // Initialize selected users when assignments load - use useCallback to prevent infinite loops
  const initializeSelectedUsers = useCallback(() => {
    if (assignments.length > 0) {
      const userIds = assignments.map((a: ProjectAssignment) => a.user_id);
      setSelectedUserIds(userIds);
    } else {
      setSelectedUserIds([]);
    }
  }, [assignments]);

  useEffect(() => {
    initializeSelectedUsers();
  }, [initializeSelectedUsers]);

  const assignUsersMutation = useMutation({
    mutationFn: async () => {
      if (!project) return;

      // Refetch current assignments to get the most up-to-date data
      const currentAssignments = await fetchProjectAssignments(project.id);
      const currentUserIds = currentAssignments.map((a: ProjectAssignment) => a.user_id);
      
      const usersToAdd = selectedUserIds.filter(id => !currentUserIds.includes(id));
      const usersToRemove = currentUserIds.filter(id => !selectedUserIds.includes(id));

      console.log("Assignment operation:", {
        currentUserIds,
        selectedUserIds,
        usersToAdd,
        usersToRemove
      });

      // Add new users
      if (usersToAdd.length > 0) {
        console.log("Adding users:", usersToAdd);
        await bulkAssignUsersToProject(project.id, usersToAdd);
      }

      // Remove users only if explicitly deselected
      if (usersToRemove.length > 0) {
        console.log("Removing users:", usersToRemove);
        for (const userId of usersToRemove) {
          await removeUserFromProject(project.id, userId);
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project assignments updated successfully.",
      });

      // Force-refresh this project's assignment list next time
      queryClient.invalidateQueries({ queryKey: ["project-assignments", project?.id] });
      queryClient.invalidateQueries({ queryKey: ["project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating project assignments:", error);
      toast({
        title: "Error",
        description: "Failed to update project assignments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    assignUsersMutation.mutate();
  };

  const handleCancel = () => {
    // Reset to original assignments
    const originalUserIds = assignments.map((assignment: ProjectAssignment) => assignment.user_id);
    setSelectedUserIds(originalUserIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {readOnly ? "View Project Assignments" : "Manage Project Assignments"}
          </DialogTitle>
          <DialogDescription>
            {readOnly 
              ? `View users assigned to "${project?.name}" project.`
              : `Assign users to "${project?.name}" project. Only assigned users can log time to this project.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-1">
              <ProjectAssigneeSelector
                selectedUserIds={selectedUserIds}
                onSelectionChange={readOnly ? () => {} : setSelectedUserIds}
                disabled={assignUsersMutation.isPending || readOnly}
              />
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleCancel} disabled={assignUsersMutation.isPending}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={assignUsersMutation.isPending}>
              {assignUsersMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectAssignmentDialog;
