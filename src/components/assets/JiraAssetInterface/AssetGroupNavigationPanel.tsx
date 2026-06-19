import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Package, Building2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AssetGroupService } from "@/lib/asset-group-service";
import { fetchCustomers, type Customer } from "@/lib/customer-service";
import type { AssetGroup } from "@/types/asset-types";
import { AssetService } from "@/lib/asset-service";
import { useQuery, useQueries } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface AssetGroupNavigationPanelProps {
  selectedGroupId?: string;
  onGroupSelect: (group: AssetGroup) => void;
  initialSelectedGroupId?: string;
}

export function AssetGroupNavigationPanel({ 
  selectedGroupId, 
  onGroupSelect,
  initialSelectedGroupId 
}: AssetGroupNavigationPanelProps) {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  const { data: assetGroups = [] } = useQuery({
    queryKey: ['asset-groups'],
    queryFn: AssetGroupService.getAssetGroups,
  });

  // Load asset counts per group using React Query so they respond to realtime invalidations
  const countQueries = useQueries({
    queries: assetGroups.map((group) => ({
      queryKey: ['assets', group.id, ''],
      queryFn: () => AssetService.getAssets({ group_ids: [group.id] }, 1, 1),
    })),
  });

  const assetCounts: Record<string, number> = assetGroups.reduce((acc, group, i) => {
    acc[group.id] = countQueries[i]?.data?.total ?? 0;
    return acc;
  }, {} as Record<string, number>);

  // Auto-select initial group and expand its customer
  useEffect(() => {
    if (initialSelectedGroupId && assetGroups.length > 0) {
      const initialGroup = assetGroups.find(g => g.id === initialSelectedGroupId);
      if (initialGroup) {
        onGroupSelect(initialGroup);
        if (initialGroup.customer_id) {
          setExpandedCustomers(prev => new Set(prev).add(initialGroup.customer_id!));
        }
      }
    }
  }, [initialSelectedGroupId, assetGroups, onGroupSelect]);

  const toggleCustomerExpansion = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Group asset groups by customer
  const groupsByCustomer = assetGroups.reduce((acc, group) => {
    const customerId = group.customer_id || 'unassigned';
    if (!acc[customerId]) {
      acc[customerId] = [];
    }
    acc[customerId].push(group);
    return acc;
  }, {} as Record<string, AssetGroup[]>);

  // Get customer details
  const getCustomerById = (id: string) => customers.find(c => c.id === id);

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Asset Groups</h3>
      </div>

      <div className="space-y-1">
        {/* Render groups by customer */}
        {Object.entries(groupsByCustomer).map(([customerId, groups]) => {
          const customer = customerId !== 'unassigned' ? getCustomerById(customerId) : null;
          const isExpanded = expandedCustomers.has(customerId);
          
          return (
            <div key={customerId} className="space-y-1">
              {/* Customer Header */}
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto"
                onClick={() => toggleCustomerExpansion(customerId)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {customer ? (
                    <Building2 className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {customer?.name || 'Unassigned'}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {groups.length}
                </Badge>
              </Button>

              {/* Asset Groups under this customer */}
              {isExpanded && (
                <div className="ml-6 space-y-1">
                  {groups
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((group) => (
                      <Button
                        key={group.id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-between p-2 h-auto text-left",
                          selectedGroupId === group.id && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => onGroupSelect(group)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div 
                            className="h-3 w-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: group.color || '#6366f1' }}
                          />
                          <span className="text-sm truncate">{group.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {assetCounts[group.id] || 0}
                        </Badge>
                      </Button>
                    ))}
                </div>
              )}
            </div>
          );
        })}

        {assetGroups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No asset groups found</p>
          </div>
        )}
      </div>
    </div>
  );
}