import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useAllTiers, useTierMutations, type Tier } from "@/hooks/useCostCalculatorAdmin";

export function TierManagement() {
  const { data: tiers, isLoading } = useAllTiers();
  const { createTier, updateTier, deleteTier } = useTierMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    tier_key: "",
    label: "",
    sub_label: "",
    rate_per_user: 0,
    min_monthly: 0,
    devices_per_user: 1.5,
    margin: 0.40,
    security_included: false,
    recommended_min_users: 0,
    sort_order: 0,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      tier_key: "",
      label: "",
      sub_label: "",
      rate_per_user: 0,
      min_monthly: 0,
      devices_per_user: 1.5,
      margin: 0.40,
      security_included: false,
      recommended_min_users: 0,
      sort_order: 0,
      is_active: true,
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      sort_order: (tiers?.length || 0) + 1,
    }));
    setDialogOpen(true);
  };

  const openEditDialog = (item: Tier) => {
    setEditingItem(item);
    setFormData({
      tier_key: item.tier_key,
      label: item.label,
      sub_label: item.sub_label || "",
      rate_per_user: item.rate_per_user,
      min_monthly: item.min_monthly,
      devices_per_user: item.devices_per_user,
      margin: item.margin,
      security_included: item.security_included,
      recommended_min_users: item.recommended_min_users || 0,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      sub_label: formData.sub_label || null,
      recommended_min_users: formData.recommended_min_users || null,
    };
    
    if (editingItem) {
      await updateTier.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await createTier.mutateAsync(payload);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteTier.mutateAsync(deletingId);
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
          <h3 className="text-lg font-medium">Service Tiers</h3>
          <p className="text-sm text-muted-foreground">
            Manage pricing tiers (e.g., Essential, Managed, Assured)
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Rate/User</TableHead>
              <TableHead>Min Monthly</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Security</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    {item.sub_label && (
                      <div className="text-xs text-muted-foreground">{item.sub_label}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{item.tier_key}</TableCell>
                <TableCell>${item.rate_per_user.toFixed(2)}</TableCell>
                <TableCell>${item.min_monthly.toFixed(0)}</TableCell>
                <TableCell>{(item.margin * 100).toFixed(0)}%</TableCell>
                <TableCell>
                  <Badge variant={item.security_included ? "default" : "secondary"} className={item.security_included ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900" : ""}>
                    {item.security_included ? "Included" : "Add-on"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"} className={item.is_active ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900" : ""}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
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
            {(!tiers || tiers.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No tiers found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Tier" : "Add Tier"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the tier details below" : "Enter the details for the new tier"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Essential"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier_key">Tier Key</Label>
                <Input
                  id="tier_key"
                  value={formData.tier_key}
                  onChange={(e) => setFormData({ ...formData, tier_key: e.target.value.toLowerCase() })}
                  placeholder="e.g., base"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sub_label">Sub Label (Optional)</Label>
              <Input
                id="sub_label"
                value={formData.sub_label}
                onChange={(e) => setFormData({ ...formData, sub_label: e.target.value })}
                placeholder="e.g., Helpdesk only"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate_per_user">Rate per User ($)</Label>
                <Input
                  id="rate_per_user"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate_per_user}
                  onChange={(e) => setFormData({ ...formData, rate_per_user: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_monthly">Minimum Monthly ($)</Label>
                <Input
                  id="min_monthly"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.min_monthly}
                  onChange={(e) => setFormData({ ...formData, min_monthly: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="devices_per_user">Devices per User</Label>
                <Input
                  id="devices_per_user"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.devices_per_user}
                  onChange={(e) => setFormData({ ...formData, devices_per_user: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin">Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.margin}
                  onChange={(e) => setFormData({ ...formData, margin: parseFloat(e.target.value) || 0 })}
                  required
                />
                <p className="text-xs text-muted-foreground">Enter as decimal (e.g., 0.40 = 40%)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recommended_min_users">Recommended Min Users</Label>
                <Input
                  id="recommended_min_users"
                  type="number"
                  min="0"
                  value={formData.recommended_min_users}
                  onChange={(e) => setFormData({ ...formData, recommended_min_users: parseInt(e.target.value, 10) || 0 })}
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
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="security_included"
                  checked={formData.security_included}
                  onCheckedChange={(checked) => setFormData({ ...formData, security_included: checked })}
                />
                <Label htmlFor="security_included">Security Included</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTier.isPending || updateTier.isPending} className="bg-green-600 hover:bg-green-700">
                {(createTier.isPending || updateTier.isPending) && (
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
            <AlertDialogTitle>Delete Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tier? This will also delete all associated features and in-house config.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTier.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
