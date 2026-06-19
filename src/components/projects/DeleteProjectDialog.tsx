
import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Project } from "@/lib/timesheet-service";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const DeleteProjectDialog: React.FC<DeleteProjectDialogProps> = ({ 
  isOpen, 
  onClose, 
  project 
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Delete project mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      // Check if the project has timesheet entries
      const { count, error: countError } = await supabase
        .from("timesheet_entries")
        .select("*", { count: 'exact', head: true })
        .eq("project_id", project.id);
      
      if (countError) throw countError;
      
      // If project has entries, set it to inactive instead of deleting
      if (count && count > 0) {
        const { error } = await supabase
          .from("projects")
          .update({ is_active: false })
          .eq("id", project.id);
        
        if (error) throw error;
        return { id: project.id, deactivated: true };
      } else {
        // If project has no entries, delete it
        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("id", project.id);
        
        if (error) throw error;
        return { id: project.id, deactivated: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      
      toast({
        title: result.deactivated ? "Project deactivated" : "Project deleted",
        description: result.deactivated
          ? "The project has been deactivated because it has timesheet entries."
          : "The project has been permanently deleted.",
      });
      
      onClose();
    },
    onError: (error) => {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            <p>
              You are about to delete the project <span className="font-semibold">{project.name}</span>.
            </p>
            <p className="mt-2">
              If this project has timesheet entries, it will be marked as inactive rather than deleted.
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? "Deleting..." : "Delete Project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteProjectDialog;
