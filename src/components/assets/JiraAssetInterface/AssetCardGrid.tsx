import React, { useState, useRef } from "react";
import { Search, Plus, Filter, AlertTriangle, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AssetService } from "@/lib/asset-service";
import { CreateAssetDialog } from "@/components/assets/CreateAssetDialog";
import { Input } from "@/components/ui/input";
import type { Asset, AssetGroup, AssetType } from "@/types/asset-types";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface AssetCardGridProps {
  selectedGroup: AssetGroup | null;
  selectedAssetId?: string;
  onAssetSelect: (asset: Asset) => void;
  onAssetsUpdate: (assets: Asset[]) => void;
}

export function AssetCardGrid({
  selectedGroup,
  selectedAssetId,
  onAssetSelect,
  onAssetsUpdate
}: AssetCardGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [deviceUserName, setDeviceUserName] = useState("");

  const onAssetsUpdateRef = useRef(onAssetsUpdate);
  onAssetsUpdateRef.current = onAssetsUpdate;

  // Load asset types for filter
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => AssetService.getAssetTypes(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: queryResult, isLoading: loading } = useQuery({
    queryKey: ['assets', selectedGroup?.id, searchTerm, selectedTypeIds],
    queryFn: async () => {
      if (!selectedGroup) return { assets: [], total: 0 };
      const result = await AssetService.getAssets(
        {
          group_ids: [selectedGroup.id],
          search: searchTerm || undefined,
          type_ids: selectedTypeIds.length > 0 ? selectedTypeIds : undefined,
        },
        1,
        100
      );
      onAssetsUpdateRef.current(result.assets);
      return result;
    },
    enabled: !!selectedGroup,
  });

  const allAssets = queryResult?.assets ?? [];
  const assets = deviceUserName
    ? allAssets.filter((a) =>
        a.device_user?.name.toLowerCase().includes(deviceUserName.toLowerCase())
      )
    : allAssets;

  const activeFilterCount = selectedTypeIds.length + (deviceUserName ? 1 : 0);

  const handleTypeToggle = (typeId: string, checked: boolean) => {
    setSelectedTypeIds(prev =>
      checked ? [...prev, typeId] : prev.filter(id => id !== typeId)
    );
  };

  const clearFilters = () => {
    setSelectedTypeIds([]);
    setDeviceUserName("");
  };

  const handleAssetCreate = () => {
    setShowCreateDialog(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in use': return 'default';
      case 'in stock': return 'secondary';
      case 'in repair': return 'destructive';
      case 'retired': return 'outline';
      default: return 'default';
    }
  };

  if (!selectedGroup) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Package className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-semibold">Select an Asset Group</h3>
            <p className="text-sm text-muted-foreground">
              Choose an asset group from the left panel to view its assets
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="h-4 w-4 rounded-full" 
              style={{ backgroundColor: selectedGroup.color || '#6366f1' }}
            />
            <div>
              <h2 className="font-semibold">{selectedGroup.name}</h2>
              <p className="text-sm text-muted-foreground">
                {assets.length} asset{assets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  Clear all
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Device Type Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Device Type</Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {assetTypes.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grid-type-${type.id}`}
                        checked={selectedTypeIds.includes(type.id)}
                        onCheckedChange={(checked) =>
                          handleTypeToggle(type.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`grid-type-${type.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {type.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned User Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Assigned To</Label>
                <Input
                  placeholder="Filter by name..."
                  value={deviceUserName}
                  onChange={(e) => setDeviceUserName(e.target.value)}
                />
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                {selectedTypeIds.map((typeId) => {
                  const type = assetTypes.find(t => t.id === typeId);
                  return type ? (
                    <Badge
                      key={typeId}
                      variant="secondary"
                      className="text-xs gap-1 cursor-pointer"
                      onClick={() => handleTypeToggle(typeId, false)}
                    >
                      {type.name}
                      <X className="h-3 w-3" />
                    </Badge>
                  ) : null;
                })}
                {deviceUserName && (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 cursor-pointer"
                    onClick={() => setDeviceUserName("")}
                  >
                    User: {deviceUserName}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Asset Cards */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !loading && assets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No assets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || activeFilterCount > 0
                  ? "No assets match your search or filters"
                  : "This group doesn't have any assets yet"
                }
              </p>
              {!searchTerm && activeFilterCount === 0 && (
                <Button onClick={() => setShowCreateDialog(true)} size="sm">
                  Create First Asset
                </Button>
              )}
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : !loading && (
            <div className="grid grid-cols-1 gap-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
                    selectedAssetId === asset.id && "bg-accent border-accent-foreground/20"
                  )}
                  onClick={() => onAssetSelect(asset)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {asset.asset_key}
                      </span>
                      {AssetService.isWarrantyExpiring(asset) && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <Badge 
                      variant={getStatusBadgeVariant(asset.status?.name || '')}
                      className="text-xs"
                    >
                      {asset.status?.name}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{asset.label}</h4>
                    <p className="text-xs text-muted-foreground">{asset.type?.name}</p>
                    {asset.device_user && (
                      <p className="text-xs text-muted-foreground">
                        Assigned: {asset.device_user.name}
                      </p>
                    )}
                    {asset.location && (
                      <p className="text-xs text-muted-foreground">
                        Location: {asset.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Asset Dialog */}
      <CreateAssetDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        defaultGroupId={selectedGroup.id}
        onSuccess={handleAssetCreate}
      />
    </div>
  );
}
