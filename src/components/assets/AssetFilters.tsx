import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AssetService } from "@/lib/asset-service";
import { AssetGroupService } from "@/lib/asset-group-service";
import { fetchCustomers, type Customer } from "@/lib/customer-service";
import type { AssetType, AssetStatus, AssetGroup, AssetFilters as AssetFiltersType } from "@/types/asset-types";

interface AssetFiltersProps {
  filters: AssetFiltersType;
  onFiltersChange: (filters: Partial<AssetFiltersType>) => void;
  onClearFilters: () => void;
  selectedCustomer?: Customer | null;
}

export function AssetFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  selectedCustomer
}: AssetFiltersProps) {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [types, statuses] = await Promise.all([
          AssetService.getAssetTypes(),
          AssetService.getAssetStatuses()
        ]);
        
        // Load customer-specific groups if customer is selected, otherwise all groups
        const groups = selectedCustomer 
          ? await AssetGroupService.getAssetGroupsByCustomer(selectedCustomer.id)
          : await AssetGroupService.getAssetGroups();
        
        setAssetTypes(types);
        setAssetStatuses(statuses);
        setAssetGroups(groups);
      } catch (error) {
        console.error('Failed to load filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFilterData();
  }, [selectedCustomer]);

  const handleTypeToggle = (typeId: string, checked: boolean) => {
    const currentTypes = filters.type_ids || [];
    if (checked) {
      onFiltersChange({ type_ids: [...currentTypes, typeId] });
    } else {
      onFiltersChange({ type_ids: currentTypes.filter(id => id !== typeId) });
    }
  };

  const handleStatusToggle = (statusId: string, checked: boolean) => {
    const currentStatuses = filters.status_ids || [];
    if (checked) {
      onFiltersChange({ status_ids: [...currentStatuses, statusId] });
    } else {
      onFiltersChange({ status_ids: currentStatuses.filter(id => id !== statusId) });
    }
  };

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const currentGroups = filters.group_ids || [];
    if (checked) {
      onFiltersChange({ group_ids: [...currentGroups, groupId] });
    } else {
      onFiltersChange({ group_ids: currentGroups.filter(id => id !== groupId) });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Filter Assets</h3>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Asset Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Asset Types</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {assetTypes.map((type) => (
              <div key={type.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.id}`}
                  checked={filters.type_ids?.includes(type.id) || false}
                  onCheckedChange={(checked) => 
                    handleTypeToggle(type.id, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`type-${type.id}`}
                  className="text-sm cursor-pointer"
                >
                  {type.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Statuses */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {assetStatuses.map((status) => (
              <div key={status.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.id}`}
                  checked={filters.status_ids?.includes(status.id) || false}
                  onCheckedChange={(checked) => 
                    handleStatusToggle(status.id, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`status-${status.id}`}
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.colour }}
                  />
                  {status.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Groups */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Groups {selectedCustomer && `(${selectedCustomer.name})`}
          </Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {assetGroups.length > 0 ? (
              assetGroups.map((group) => (
                <div key={group.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={filters.group_ids?.includes(group.id) || false}
                    onCheckedChange={(checked) => 
                      handleGroupToggle(group.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`group-${group.id}`}
                    className="text-sm cursor-pointer flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </Label>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                {selectedCustomer ? 'No groups for this customer' : 'No groups available'}
              </p>
            )}
          </div>
        </div>

        {/* Assigned User Filter */}
        <div className="space-y-3">
          <Label htmlFor="user-filter" className="text-sm font-medium">
            Assigned To
          </Label>
          <Select
            value={filters.device_user_id || ''}
            onValueChange={(value) => 
              onFiltersChange({ device_user_id: value || undefined })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All users</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location Filter */}
        <div className="space-y-3">
          <Label htmlFor="location-filter" className="text-sm font-medium">
            Location
          </Label>
          <Input
            id="location-filter"
            placeholder="Filter by location..."
            value={filters.location || ''}
            onChange={(e) => 
              onFiltersChange({ location: e.target.value || undefined })
            }
          />
        </div>
      </div>

      {/* Quick Warranty Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Warranty Alerts</Label>
        <div className="flex flex-wrap gap-2">
          {[30, 60, 90].map((days) => (
            <Badge
              key={days}
              variant={filters.warranty_expiring_days === days ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => 
                onFiltersChange({ 
                  warranty_expiring_days: filters.warranty_expiring_days === days ? undefined : days 
                })
              }
            >
              Expiring in {days} days
            </Badge>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.type_ids?.length || filters.status_ids?.length || filters.device_user_id || filters.location || filters.warranty_expiring_days) && (
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">
            Active filters ({
              (filters.type_ids?.length || 0) + 
              (filters.status_ids?.length || 0) + 
              (filters.device_user_id ? 1 : 0) + 
              (filters.location ? 1 : 0) + 
              (filters.warranty_expiring_days ? 1 : 0)
            }):
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.type_ids?.map((typeId) => {
              const type = assetTypes.find(t => t.id === typeId);
              return type ? (
                <Badge key={typeId} variant="secondary" className="text-xs">
                  Type: {type.name}
                </Badge>
              ) : null;
            })}
            
            {filters.status_ids?.map((statusId) => {
              const status = assetStatuses.find(s => s.id === statusId);
              return status ? (
                <Badge key={statusId} variant="secondary" className="text-xs">
                  Status: {status.name}
                </Badge>
              ) : null;
            })}
            
            {filters.device_user_id && (
              <Badge variant="secondary" className="text-xs">
                Assigned: {filters.device_user_id === 'unassigned' ? 'Unassigned' : 'Selected'}
              </Badge>
            )}
            
            {filters.location && (
              <Badge variant="secondary" className="text-xs">
                Location: {filters.location}
              </Badge>
            )}
            
            {filters.warranty_expiring_days && (
              <Badge variant="secondary" className="text-xs">
                Warranty: {filters.warranty_expiring_days} days
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}