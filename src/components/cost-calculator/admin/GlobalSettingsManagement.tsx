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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Info } from "lucide-react";
import { useAllSettings, useSettingsMutations, type Setting } from "@/hooks/useCostCalculatorAdmin";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GlobalSettingsManagement() {
  const { data: settings, isLoading } = useAllSettings();
  const { updateSetting, createSetting, deleteSetting } = useSettingsMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Setting | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      key: "",
      value: "",
      description: "",
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: Setting) => {
    setEditingItem(item);
    setFormData({
      key: item.key,
      value: item.value,
      description: item.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      await updateSetting.mutateAsync({ key: editingItem.key, value: formData.value });
    } else {
      await createSetting.mutateAsync({
        key: formData.key,
        value: formData.value,
        description: formData.description || null,
      });
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingKey) {
      await deleteSetting.mutateAsync(deletingKey);
      setDeleteDialogOpen(false);
      setDeletingKey(null);
    }
  };

  const confirmDelete = (key: string) => {
    setDeletingKey(key);
    setDeleteDialogOpen(true);
  };

  const formatValue = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    
    // Format as percentage if key contains 'rate' or 'discount'
    if (key.includes('rate') || key.includes('discount')) {
      return `${(numValue * 100).toFixed(2)}%`;
    }
    // Format as currency if key contains 'addon' or 'fee'
    if (key.includes('addon') || key.includes('fee') || key.includes('min')) {
      return `$${numValue.toFixed(2)}`;
    }
    return value;
  };

  const formatKeyLabel = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
          <h3 className="text-lg font-medium">Global Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure calculation rates, discounts, and other global parameters
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Setting
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Raw Value</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings?.map((item) => (
              <TableRow key={item.key}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatKeyLabel(item.key)}</span>
                    {item.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{item.key}</div>
                </TableCell>
                <TableCell className="font-medium text-green-700">
                  {formatValue(item.key, item.value)}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {item.value}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(item.key)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!settings || settings.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No settings found. Add one to get started.
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
            <DialogTitle>{editingItem ? "Edit Setting" : "Add Setting"}</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Update the setting value below" 
                : "Enter the details for the new setting"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., super_rate"
                required
                disabled={!!editingItem}
              />
              {!editingItem && (
                <p className="text-xs text-muted-foreground">Use snake_case (e.g., super_rate, volume_discount_50)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., 0.12"
                required
              />
              <p className="text-xs text-muted-foreground">
                For percentages, enter as decimal (e.g., 0.12 = 12%). For currency, enter as number (e.g., 30).
              </p>
            </div>
            {!editingItem && (
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this setting controls"
                  rows={2}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateSetting.isPending || createSetting.isPending} 
                className="bg-green-600 hover:bg-green-700"
              >
                {(updateSetting.isPending || createSetting.isPending) && (
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
            <AlertDialogTitle>Delete Setting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this setting? This may break calculator functionality if the setting is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSetting.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
