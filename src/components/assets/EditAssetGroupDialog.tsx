import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { AssetGroupService } from "@/lib/asset-group-service";
import { fetchCustomers } from "@/lib/customer-service";
import type { AssetGroup, UpdateAssetGroupRequest } from "@/types/asset-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GROUP_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6'
];

interface EditAssetGroupDialogProps {
  group: AssetGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAssetGroupDialog({ group, open, onOpenChange }: EditAssetGroupDialogProps) {
  const [formData, setFormData] = useState<UpdateAssetGroupRequest>({
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color,
    customer_id: group.customer_id,
    sort_order: group.sort_order,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form data when group changes
  useEffect(() => {
    setFormData({
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      customer_id: group.customer_id,
      sort_order: group.sort_order,
    });
  }, [group]);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchCustomers(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAssetGroupRequest) => AssetGroupService.updateAssetGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-groups'] });
      queryClient.invalidateQueries({ queryKey: ['asset-group', group.id] });
      toast({
        title: "Success",
        description: "Asset group updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset group",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Asset Group</DialogTitle>
          <DialogDescription>
            Update the asset group details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name..."
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter group description..."
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Customer (Optional)</Label>
            <Select
              value={formData.customer_id || "none"}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                customer_id: value === "none" ? undefined : value
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No customer</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded border-2 ${
                    formData.color === color ? 'border-foreground' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              placeholder="0"
              value={formData.sort_order || 0}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                sort_order: parseInt(e.target.value, 10) || 0 
              }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}