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
import { useToast } from "@/hooks/use-toast";
import { IncidentService } from "@/lib/incident-service";
import { useNavigate } from "react-router-dom";
import type { Incident } from "@/types/incident-types";

interface DeleteIncidentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident;
}

const DeleteIncidentDialog: React.FC<DeleteIncidentDialogProps> = ({ 
  isOpen, 
  onClose, 
  incident 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const mutation = useMutation({
    mutationFn: () => IncidentService.deleteIncident(incident.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", incident.id] });
      
      toast({
        title: "Incident deleted",
        description: `Incident ${incident.incident_number} has been permanently deleted.`,
      });
      
      onClose();
      navigate("/incident-management/incidents");
    },
    onError: (error) => {
      console.error("Error deleting incident:", error);
      toast({
        title: "Error",
        description: "Failed to delete incident. Please try again.",
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
              You are about to delete incident <span className="font-semibold">{incident.incident_number}</span>: {incident.title}
            </p>
            <p className="mt-2">
              This action cannot be undone. All comments, assignments, and history will be permanently removed.
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
            {mutation.isPending ? "Deleting..." : "Delete Incident"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteIncidentDialog;