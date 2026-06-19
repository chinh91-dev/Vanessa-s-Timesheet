import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AssetService } from "@/lib/asset-service";
import type { Asset } from "@/types/asset-types";

interface DeleteAssetDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteAssetDialog({
  asset,
  open,
  onOpenChange,
  onSuccess,
}: DeleteAssetDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => AssetService.deleteAsset(asset.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: "Asset deleted",
        description: `${asset.label} has been permanently deleted.`,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting asset",
        description: error.message || "Failed to delete asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Asset
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this asset?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Asset Key:</span>
              <p className="font-mono text-sm">{asset.asset_key}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Label:</span>
              <p className="font-medium">{asset.label}</p>
            </div>
            {asset.type?.name && (
              <div>
                <span className="text-sm text-muted-foreground">Type:</span>
                <p className="text-sm">{asset.type.name}</p>
              </div>
            )}
          </div>

          <p className="mt-4 text-sm text-destructive font-medium">
            This action cannot be undone. All data associated with this asset will be permanently removed.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
