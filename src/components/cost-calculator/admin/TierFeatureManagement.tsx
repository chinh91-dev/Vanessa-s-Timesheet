import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAllTiers, useAllTierFeatures, useTierFeatureMutations, type TierFeature } from "@/hooks/useCostCalculatorAdmin";

export function TierFeatureManagement() {
  const { data: tiers, isLoading: tiersLoading } = useAllTiers();
  const { data: features, isLoading: featuresLoading } = useAllTierFeatures();
  const { createFeature, updateFeature, deleteFeature } = useTierFeatureMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TierFeature | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterTierId, setFilterTierId] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    tier_id: "",
    feature: "",
    sort_order: 0,
  });

  const isLoading = tiersLoading || featuresLoading;

  const filteredFeatures = features?.filter(f => 
    filterTierId === "all" || f.tier_id === filterTierId
  );

  const getTierLabel = (tierId: string) => {
    return tiers?.find(t => t.id === tierId)?.label || "Unknown";
  };

  const resetForm = () => {
    setFormData({
      tier_id: "",
      feature: "",
      sort_order: 0,
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    const tierFeatures = features?.filter(f => f.tier_id === (filterTierId !== "all" ? filterTierId : tiers?.[0]?.id));
    setFormData(prev => ({
      ...prev,
      tier_id: filterTierId !== "all" ? filterTierId : (tiers?.[0]?.id || ""),
      sort_order: (tierFeatures?.length || 0) + 1,
    }));
    setDialogOpen(true);
  };

  const openEditDialog = (item: TierFeature) => {
    setEditingItem(item);
    setFormData({
      tier_id: item.tier_id,
      feature: item.feature,
      sort_order: item.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      await updateFeature.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createFeature.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteFeature.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Tier Features</h3>
          <p className="text-sm text-muted-foreground">
            Manage features displayed for each pricing tier
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterTierId} onValueChange={setFilterTierId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {tiers?.map(tier => (
                <SelectItem key={tier.id} value={tier.id}>{tier.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeatures?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {getTierLabel(item.tier_id)}
                  </Badge>
                </TableCell>
                <TableCell>{item.feature}</TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredFeatures || filteredFeatures.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No features found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Feature" : "Add Feature"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the feature details below" : "Enter the details for the new feature"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tier_id">Tier</Label>
              <Select value={formData.tier_id} onValueChange={(value) => setFormData({ ...formData, tier_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers?.map(tier => (
                    <SelectItem key={tier.id} value={tier.id}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feature">Feature</Label>
              <Input
                id="feature"
                value={formData.feature}
                onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
                placeholder="e.g., 24/7 Support"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFeature.isPending || updateFeature.isPending} className="bg-green-600 hover:bg-green-700">
                {(createFeature.isPending || updateFeature.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFeature.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
