import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { 
  useAllServiceCategories, 
  useCreateServiceCategory, 
  useUpdateServiceCategory, 
  useDeleteServiceCategory,
  type ServiceCategory 
} from "@/hooks/crm/useServiceCategories";
import { canDeleteEntity } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";

interface ServiceCategoryManagementProps {
  open: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
];

export function ServiceCategoryManagement({ open, onClose }: ServiceCategoryManagementProps) {
  const { userRole } = useAuth();
  const { data: categories, isLoading } = useAllServiceCategories();
  const createCategory = useCreateServiceCategory();
  const updateCategory = useUpdateServiceCategory();
  const deleteCategory = useDeleteServiceCategory();
  
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#6366f1" });
    setEditingCategory(null);
    setIsCreating(false);
  };

  const handleEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#6366f1",
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        updates: {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
        },
      });
    } else {
      await createCategory.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
      });
    }
    
    resetForm();
  };

  const handleToggleActive = async (category: ServiceCategory) => {
    await updateCategory.mutateAsync({
      id: category.id,
      updates: { is_active: !category.is_active },
    });
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteCategory.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const canDelete = canDeleteEntity(userRole);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Service Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add/Edit Form */}
            {(isCreating || editingCategory) && (
              <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
                <h4 className="font-medium">
                  {editingCategory ? "Edit Category" : "New Category"}
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Managed IT Services, Security, Cloud"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description for this category"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.color === color 
                              ? "border-foreground scale-110" 
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData(prev => ({ ...prev, color }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={!formData.name.trim() || createCategory.isPending || updateCategory.isPending}
                  >
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            )}

            {/* Add Button */}
            {!isCreating && !editingCategory && (
              <Button onClick={handleCreate} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}

            {/* Categories Table */}
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading categories...</p>
            ) : categories?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No categories yet. Create one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color || '#6366f1' }}
                          />
                          <Badge
                            variant="outline"
                            style={{ 
                              borderColor: category.color || '#6366f1',
                              backgroundColor: `${category.color || '#6366f1'}20`,
                            }}
                          >
                            {category.name}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {category.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={category.is_active ?? true}
                          onCheckedChange={() => handleToggleActive(category)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmId(category.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Services using this category will need to be reassigned.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
