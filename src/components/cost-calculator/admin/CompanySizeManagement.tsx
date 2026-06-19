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
import { useAllCompanySizes, useCompanySizeMutations, type CompanySize } from "@/hooks/useCostCalculatorAdmin";

export function CompanySizeManagement() {
  const { data: sizes, isLoading } = useAllCompanySizes();
  const { createCompanySize, updateCompanySize, deleteCompanySize } = useCompanySizeMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompanySize | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    label: "",
    sub_label: "",
    default_users: 10,
    sort_order: 0,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      label: "",
      sub_label: "",
      default_users: 10,
      sort_order: 0,
      is_active: true,
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      sort_order: (sizes?.length || 0) + 1,
    }));
    setDialogOpen(true);
  };

  const openEditDialog = (item: CompanySize) => {
    setEditingItem(item);
    setFormData({
      label: item.label,
      sub_label: item.sub_label || "",
      default_users: item.default_users,
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
    };
    
    if (editingItem) {
      await updateCompanySize.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await createCompanySize.mutateAsync(payload);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCompanySize.mutateAsync(deletingId);
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
          <h3 className="text-lg font-medium">Company Sizes</h3>
          <p className="text-sm text-muted-foreground">
            Manage company size options for the calculator
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Company Size
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Default Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sizes?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    {item.sub_label && (
                      <div className="text-xs text-muted-foreground">{item.sub_label}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{item.default_users} users</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"} className={item.is_active ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900" : ""}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
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
            {(!sizes || sizes.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No company sizes found. Add one to get started.
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
            <DialogTitle>{editingItem ? "Edit Company Size" : "Add Company Size"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the company size details below" : "Enter the details for the new company size"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Small Business"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub_label">Sub Label (Optional)</Label>
              <Input
                id="sub_label"
                value={formData.sub_label}
                onChange={(e) => setFormData({ ...formData, sub_label: e.target.value })}
                placeholder="e.g., 1-10 employees"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_users">Default Users</Label>
              <Input
                id="default_users"
                type="number"
                min="1"
                value={formData.default_users}
                onChange={(e) => setFormData({ ...formData, default_users: parseInt(e.target.value, 10) || 1 })}
                required
              />
              <p className="text-xs text-muted-foreground">Number of users used for calculations when this size is selected</p>
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
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCompanySize.isPending || updateCompanySize.isPending} className="bg-green-600 hover:bg-green-700">
                {(createCompanySize.isPending || updateCompanySize.isPending) && (
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
            <AlertDialogTitle>Delete Company Size</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this company size? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCompanySize.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
