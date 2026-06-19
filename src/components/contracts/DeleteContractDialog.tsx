
import React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Contract, deleteContract } from "@/lib/contract-service";

interface DeleteContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
}

const DeleteContractDialog: React.FC<DeleteContractDialogProps> = ({
  isOpen,
  onClose,
  contract,
}) => {
  const queryClient = useQueryClient();

  // Delete contract mutation
  const { mutate: deleteContractMutation, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteContract(contract.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Contract deleted",
        description: `${contract.name} has been deleted successfully.`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Error deleting contract:", error);
      toast({
        title: "Error",
        description: "Failed to delete contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Contract</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the contract "{contract.name}"? This action cannot be undone.
            {contract.services && contract.services.length > 0 && (
              <div className="mt-2">
                <span className="font-medium">Note:</span> This will also remove {contract.services.length} service{contract.services.length !== 1 && "s"} associated with this contract.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteContractMutation();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteContractDialog;
