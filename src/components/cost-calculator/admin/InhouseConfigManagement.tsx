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
import { useAllTiers, useAllInhouseConfig, useInhouseConfigMutations, type InhouseConfig } from "@/hooks/useCostCalculatorAdmin";

export function InhouseConfigManagement() {
  const { data: tiers, isLoading: tiersLoading } = useAllTiers();
  const { data: configs, isLoading: configsLoading } = useAllInhouseConfig();
  const { createConfig, updateConfig, deleteConfig } = useInhouseConfigMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InhouseConfig | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    tier_id: "",
    service_desk_per_users: 50,
    sys_admin_per_users: 100,
    manager_per_users: 150,
  });

  const isLoading = tiersLoading || configsLoading;

  const getTierLabel = (tierId: string) => {
    return tiers?.find(t => t.id === tierId)?.label || "Unknown";
  };

  // Get tiers that don't have a config yet
  const availableTiers = tiers?.filter(t => 
    !configs?.some(c => c.tier_id === t.id) || editingItem?.tier_id === t.id
  );

  const resetForm = () => {
    setFormData({
      tier_id: "",
      service_desk_per_users: 50,
      sys_admin_per_users: 100,
      manager_per_users: 150,
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      tier_id: availableTiers?.[0]?.id || "",
    }));
    setDialogOpen(true);
  };

  const openEditDialog = (item: InhouseConfig) => {
    setEditingItem(item);
    setFormData({
      tier_id: item.tier_id,
      service_desk_per_users: item.service_desk_per_users,
      sys_admin_per_users: item.sys_admin_per_users || 0,
      manager_per_users: item.manager_per_users,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      sys_admin_per_users: formData.sys_admin_per_users || null,
    };
    
    if (editingItem) {
      await updateConfig.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await createConfig.mutateAsync(payload);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteConfig.mutateAsync(deletingId);
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
          <h3 className="text-lg font-medium">FTE Ratios</h3>
          <p className="text-sm text-muted-foreground">
            Configure users-per-FTE ratios for in-house cost calculations per tier
          </p>
        </div>
        <Button 
          onClick={openCreateDialog} 
          className="bg-green-600 hover:bg-green-700"
          disabled={!availableTiers?.length}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Config
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>Service Desk</TableHead>
              <TableHead>Sys Admin</TableHead>
              <TableHead>IT Manager</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {getTierLabel(item.tier_id)}
                  </Badge>
                </TableCell>
                <TableCell>1 per {item.service_desk_per_users} users</TableCell>
                <TableCell>
                  {item.sys_admin_per_users 
                    ? `1 per ${item.sys_admin_per_users} users`
                    : <span className="text-muted-foreground">N/A</span>
                  }
                </TableCell>
                <TableCell>1 per {item.manager_per_users} users</TableCell>
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
            {(!configs || configs.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No FTE configs found. Add one to get started.
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
            <DialogTitle>{editingItem ? "Edit FTE Config" : "Add FTE Config"}</DialogTitle>
            <DialogDescription>
              Configure how many users each role can support for in-house calculations
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tier_id">Tier</Label>
              <Select 
                value={formData.tier_id} 
                onValueChange={(value) => setFormData({ ...formData, tier_id: value })}
                disabled={!!editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {(editingItem ? tiers : availableTiers)?.map(tier => (
                    <SelectItem key={tier.id} value={tier.id}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_desk_per_users">Service Desk: Users per FTE</Label>
              <Input
                id="service_desk_per_users"
                type="number"
                min="1"
                value={formData.service_desk_per_users}
                onChange={(e) => setFormData({ ...formData, service_desk_per_users: parseInt(e.target.value, 10) || 1 })}
                required
              />
              <p className="text-xs text-muted-foreground">1 Service Desk FTE per this many users</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sys_admin_per_users">Sys Admin: Users per FTE</Label>
              <Input
                id="sys_admin_per_users"
                type="number"
                min="0"
                value={formData.sys_admin_per_users}
                onChange={(e) => setFormData({ ...formData, sys_admin_per_users: parseInt(e.target.value, 10) || 0 })}
              />
              <p className="text-xs text-muted-foreground">1 Sys Admin FTE per this many users (0 = not applicable)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager_per_users">IT Manager: Users per FTE</Label>
              <Input
                id="manager_per_users"
                type="number"
                min="1"
                value={formData.manager_per_users}
                onChange={(e) => setFormData({ ...formData, manager_per_users: parseInt(e.target.value, 10) || 1 })}
                required
              />
              <p className="text-xs text-muted-foreground">1 IT Manager FTE per this many users</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createConfig.isPending || updateConfig.isPending} className="bg-green-600 hover:bg-green-700">
                {(createConfig.isPending || updateConfig.isPending) && (
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
            <AlertDialogTitle>Delete FTE Config</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FTE configuration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
