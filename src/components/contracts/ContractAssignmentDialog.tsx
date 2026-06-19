
import React, { useState } from "react";
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
import { Contract } from "@/lib/contract-service";
import {
  fetchContractAssignments,
  bulkAssignUsersToContract,
  removeUserFromContract,
} from "@/lib/contract/assignment-service";
import { ContractAssignment } from "@/lib/contract/assignment-types";
import ContractAssigneeSelector from "./ContractAssigneeSelector";

interface ContractAssignmentDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

const ContractAssignmentDialog: React.FC<ContractAssignmentDialogProps> = ({
  contract,
  open,
  onOpenChange,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Fetch current assignments for this contract
  const { data: assignments = [] } = useQuery({
    queryKey: ["contract-assignments", contract?.id],
    queryFn: () => contract ? fetchContractAssignments(contract.id) : Promise.resolve([]),
    enabled: !!contract && open,
  });

  // Initialize selected users when assignments load
  React.useEffect(() => {
    if (assignments.length > 0) {
      const userIds = assignments.map((assignment: ContractAssignment) => assignment.user_id);
      setSelectedUserIds(userIds);
    } else {
      setSelectedUserIds([]);
    }
  }, [assignments]);

  const assignUsersMutation = useMutation({
    mutationFn: async () => {
      if (!contract || readOnly) return;

      const currentUserIds = assignments.map((a: ContractAssignment) => a.user_id);
      const usersToAdd = selectedUserIds.filter(id => !currentUserIds.includes(id));
      const usersToRemove = currentUserIds.filter(id => !selectedUserIds.includes(id));

      // Add new users
      if (usersToAdd.length > 0) {
        await bulkAssignUsersToContract(contract.id, usersToAdd);
      }

      // Remove users
      for (const userId of usersToRemove) {
        await removeUserFromContract(contract.id, userId);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract assignments updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["contract-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating contract assignments:", error);
      toast({
        title: "Error",
        description: "Failed to update contract assignments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!readOnly) {
      assignUsersMutation.mutate();
    }
  };

  const handleCancel = () => {
    // Reset to original assignments only if not read-only
    if (!readOnly) {
      const originalUserIds = assignments.map((assignment: ContractAssignment) => assignment.user_id);
      setSelectedUserIds(originalUserIds);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {readOnly ? "View Contract Assignments" : "Manage Contract Assignments"}
          </DialogTitle>
          <DialogDescription>
            {readOnly 
              ? `View users assigned to "${contract?.name}" contract.`
              : `Assign users to "${contract?.name}" contract. Only assigned users can log time to this contract.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-1">
              <ContractAssigneeSelector
                selectedUserIds={selectedUserIds}
                onSelectionChange={readOnly ? () => {} : setSelectedUserIds}
                disabled={assignUsersMutation.isPending || readOnly}
              />
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0">
          {readOnly ? (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={assignUsersMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={assignUsersMutation.isPending}>
                {assignUsersMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractAssignmentDialog;
