import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAllSalaries, useSalaryMutations, type Salary } from "@/hooks/useCostCalculatorAdmin";

export function SalaryManagement() {
  const { data: salaries, isLoading } = useAllSalaries();
  const { createSalary, updateSalary, deleteSalary } = useSalaryMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Salary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    role_key: "",
    role_name: "",
    annual_salary: 0,
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      role_key: "",
      role_name: "",
      annual_salary: 0,
      sort_order: 0,
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      sort_order: (salaries?.length || 0) + 1,
    }));
    setDialogOpen(true);
  };

  const openEditDialog = (item: Salary) => {
    setEditingItem(item);
    setFormData({
      role_key: item.role_key,
      role_name: item.role_name,
      annual_salary: item.annual_salary,
      sort_order: item.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      await updateSalary.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createSalary.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteSalary.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount);
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
          <h3 className="text-lg font-medium">Role Salaries</h3>
          <p className="text-sm text-muted-foreground">
            Manage annual salaries for in-house cost calculations
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Role Key</TableHead>
              <TableHead>Annual Salary</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaries?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.role_name}</TableCell>
                <TableCell className="font-mono text-sm">{item.role_key}</TableCell>
                <TableCell>{formatCurrency(item.annual_salary)}</TableCell>
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
            {(!salaries || salaries.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No salaries found. Add one to get started.
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
            <DialogTitle>{editingItem ? "Edit Role" : "Add Role"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the role salary details below" : "Enter the details for the new role"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role_name">Role Name</Label>
              <Input
                id="role_name"
                value={formData.role_name}
                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                placeholder="e.g., Service Desk Analyst"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role_key">Role Key</Label>
              <Input
                id="role_key"
                value={formData.role_key}
                onChange={(e) => setFormData({ ...formData, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., service_desk"
                required
              />
              <p className="text-xs text-muted-foreground">Used internally for calculations (e.g., service_desk, sys_admin, it_manager)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_salary">Annual Salary ($)</Label>
              <Input
                id="annual_salary"
                type="number"
                min="0"
                step="1000"
                value={formData.annual_salary}
                onChange={(e) => setFormData({ ...formData, annual_salary: parseInt(e.target.value, 10) || 0 })}
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
              <Button type="submit" disabled={createSalary.isPending || updateSalary.isPending} className="bg-green-600 hover:bg-green-700">
                {(createSalary.isPending || updateSalary.isPending) && (
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
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSalary.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
