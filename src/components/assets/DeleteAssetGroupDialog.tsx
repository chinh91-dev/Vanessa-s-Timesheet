import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AssetGroupService } from "@/lib/asset-group-service";
import type { AssetGroup } from "@/types/asset-types";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DeleteAssetGroupDialogProps {
  group: AssetGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAssetGroupDialog({ group, open, onOpenChange }: DeleteAssetGroupDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => AssetGroupService.deleteAssetGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-groups'] });
      toast({
        title: "Success",
        description: "Asset group deleted successfully",
      });
      onOpenChange(false);
      navigate('/assets');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset group",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate(group.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Asset Group
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the asset group <strong>"{group.name}"</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4">
          <p className="text-sm text-destructive font-medium">
            Warning: This will permanently delete the asset group and remove it from all associated assets.
            Assets in this group will become unassigned.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}