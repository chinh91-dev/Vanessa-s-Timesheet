import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AssetGroup, CreateAssetGroupRequest, UpdateAssetGroupRequest } from '@/types/asset-types';
import { AssetGroupService } from '@/lib/asset-group-service';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
}

const GROUP_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6'
];

interface AssetGroupManagementProps {
  selectedCustomer?: Customer | null;
}

export function AssetGroupManagement({ selectedCustomer }: AssetGroupManagementProps = {}) {
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AssetGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: GROUP_COLORS[0],
    customer_id: '',
    sort_order: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedCustomer]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [groupsData, customersData] = await Promise.all([
        AssetGroupService.getAssetGroups(),
        loadCustomers()
      ]);
      setGroups(groupsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load asset groups",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error loading customers:', error);
      return [];
    }

    return data || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingGroup) {
        const request: UpdateAssetGroupRequest = {
          id: editingGroup.id,
          ...formData,
          customer_id: formData.customer_id || undefined
        };
        await AssetGroupService.updateAssetGroup(request);
        toast({
          title: "Success",
          description: "Asset group updated successfully"
        });
      } else {
        const request: CreateAssetGroupRequest = {
          ...formData,
          customer_id: formData.customer_id || undefined
        };
        await AssetGroupService.createAssetGroup(request);
        toast({
          title: "Success",
          description: "Asset group created successfully"
        });
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving asset group:', error);
      toast({
        title: "Error",
        description: "Failed to save asset group",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (group: AssetGroup) => {
    if (!confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      return;
    }

    try {
      await AssetGroupService.deleteAssetGroup(group.id);
      toast({
        title: "Success",
        description: "Asset group deleted successfully"
      });
      loadData();
    } catch (error) {
      console.error('Error deleting asset group:', error);
      toast({
        title: "Error",
        description: "Failed to delete asset group",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (group: AssetGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color,
      customer_id: group.customer_id || '',
      sort_order: group.sort_order
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      color: GROUP_COLORS[0],
      customer_id: '',
      sort_order: 0
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading asset groups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Asset Groups</h2>
          <p className="text-muted-foreground">
            Organize your assets into groups for better management
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Edit Asset Group' : 'Create Asset Group'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2 mt-2">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="customer">Customer (Optional)</Label>
                <Select 
                  value={formData.customer_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGroup ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: group.color }}
                  />
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(group)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(group)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {group.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {group.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2">
                {group.customer && (
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {group.customer.name}
                  </Badge>
                )}
                <Badge variant="outline">
                  Order: {group.sort_order}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">No asset groups found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first asset group to start organizing your assets
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}