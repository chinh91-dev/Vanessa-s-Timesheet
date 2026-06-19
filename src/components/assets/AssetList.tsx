import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, Download, Upload, AlertTriangle, Package, Settings, Trash2, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AssetService } from "@/lib/asset-service";
import { AssetGroupService } from "@/lib/asset-group-service";
import { AssetFilters } from "@/components/assets/AssetFilters";
import { AssetDrawer } from "@/components/assets/AssetDrawer";
import { CreateAssetDialog } from "@/components/assets/CreateAssetDialog";
import { AssetImportDialog } from "@/components/assets/AssetImportDialog";
import { AssetExportDialog } from "@/components/assets/AssetExportDialog";
import { BulkAssetOperations } from "@/components/assets/BulkAssetOperations";
import type { Asset, AssetFilters as AssetFiltersType } from "@/types/asset-types";
import type { Customer } from "@/lib/customer-service";
import { toast } from "sonner";

interface AssetRowProps {
  asset: Asset;
  selected: boolean;
  onSelect: (asset: Asset, checked: boolean) => void;
  onClick: (asset: Asset) => void;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  formatDate: (d: string | null | undefined) => string;
}

function AssetRow({ asset, selected, onSelect, onClick, getStatusBadgeVariant, formatDate }: AssetRowProps) {
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-4">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(asset, !!checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{asset.asset_key}</span>
          {AssetService.isWarrantyExpiring(asset) && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
      </td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>{asset.label}</td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>
        <span className="text-sm">{asset.type?.name}</span>
      </td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>
        <Badge
          variant={getStatusBadgeVariant(asset.status?.name || '')}
          style={{
            backgroundColor: asset.status?.colour,
            color: asset.status?.colour ? '#fff' : undefined
          }}
        >
          {asset.status?.name}
        </Badge>
      </td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>
        <span className="text-sm">{asset.device_user?.name || 'Unassigned'}</span>
      </td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>
        <span className="text-sm">{asset.location || '-'}</span>
      </td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>
        <span className="text-sm">{formatDate(asset.warranty_expiry)}</span>
      </td>
      <td className="p-4 cursor-pointer" onClick={() => onClick(asset)}>
        <span className="text-sm text-muted-foreground">{formatDate(asset.updated_at)}</span>
      </td>
    </tr>
  );
}

interface AssetListProps {
  selectedCustomer?: Customer | null;
  groupId?: string;
  showCreateButton?: boolean;
  hideGroupColumn?: boolean;
}

export function AssetList({ selectedCustomer, groupId, showCreateButton = true, hideGroupColumn = false }: AssetListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'owner'>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  // Parse filters from URL params
  const filters: AssetFiltersType = {
    search: searchParams.get('search') || undefined,
    type_ids: searchParams.getAll('type_id').filter(Boolean),
    status_ids: searchParams.getAll('status_id').filter(Boolean),
    group_ids: searchParams.getAll('group_id').filter(Boolean),
    device_user_id: searchParams.get('owner') || undefined,
    location: searchParams.get('location') || undefined,
    warranty_expiring_days: (() => {
      const raw = searchParams.get('warranty_days');
      if (!raw) return undefined;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : undefined;
    })()
  };

  const loadAssets = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      let effectiveFilters = { ...filters };
      
      // If customer is selected, filter by customer groups
      if (selectedCustomer) {
        const customerGroups = await AssetGroupService.getAssetGroupsByCustomer(selectedCustomer.id);
        const customerGroupIds = customerGroups.map(g => g.id);
        
        // Merge customer group filtering with existing group filters
        if (effectiveFilters.group_ids && effectiveFilters.group_ids.length > 0) {
          // Intersect user-selected groups with customer groups
          effectiveFilters.group_ids = effectiveFilters.group_ids.filter(id => customerGroupIds.includes(id));
        } else {
          // Show only customer groups
          effectiveFilters.group_ids = customerGroupIds;
        }
      }
      
      const result = await AssetService.getAssets(effectiveFilters, page, pagination.limit);
      
      setAssets(result.assets);
      setPagination({
        page: result.page,
        limit: result.limit,
        total: result.total
      });
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load assets');
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<AssetFiltersType>) => {
    const params = new URLSearchParams();
    
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.type_ids?.length) {
      newFilters.type_ids.forEach(id => params.append('type_id', id));
    }
    if (newFilters.status_ids?.length) {
      newFilters.status_ids.forEach(id => params.append('status_id', id));
    }
    if (newFilters.group_ids?.length) {
      newFilters.group_ids.forEach(id => params.append('group_id', id));
    }
    if (newFilters.device_user_id) params.set('owner', newFilters.device_user_id);
    if (newFilters.location) params.set('location', newFilters.location);
    if (newFilters.warranty_expiring_days) {
      params.set('warranty_days', newFilters.warranty_expiring_days.toString());
    }
    
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  const handleAssetUpdate = () => {
    loadAssets(pagination.page);
    setSelectedAsset(null);
    setSelectedAssets([]); // Clear selections after update
  };

  const handleAssetCreate = () => {
    setShowCreateDialog(false);
    loadAssets(1); // Reset to first page
  };

  const handleAssetSelect = (asset: Asset, checked: boolean) => {
    if (checked) {
      setSelectedAssets(prev => [...prev, asset]);
    } else {
      setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(assets);
    } else {
      setSelectedAssets([]);
    }
  };

  const handleBulkOperationSuccess = () => {
    setShowBulkOperations(false);
    setSelectedAssets([]);
    loadAssets(pagination.page);
  };

  // Load assets when filters or customer change
  useEffect(() => {
    loadAssets(1);
  }, [searchParams, selectedCustomer]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in use': return 'default';
      case 'in stock': return 'secondary';
      case 'in repair': return 'destructive';
      case 'retired': return 'outline';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && assets.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        
        {/* Filters skeleton */}
        <div className="h-16 bg-muted rounded animate-pulse" />
        
        {/* Table skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Assets</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadAssets(pagination.page)}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeFiltersCount = Object.values(filters).filter(v =>
    v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const groupedAssets = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups = new Map<string, Asset[]>();
    for (const asset of assets) {
      const key = groupBy === 'type'
        ? (asset.type?.name || 'Unknown Type')
        : (asset.device_user?.name || 'Unassigned');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(asset);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [assets, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets by label, key, or serial..."
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-9"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Group by
                  {groupBy !== 'none' && (
                    <Badge variant="secondary" className="text-xs capitalize">{groupBy}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { setGroupBy('none'); setCollapsedGroups(new Set()); }}>
                  None
                  {groupBy === 'none' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setGroupBy('type'); setCollapsedGroups(new Set()); }}>
                  Type
                  {groupBy === 'type' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setGroupBy('owner'); setCollapsedGroups(new Set()); }}>
                  Owner
                  {groupBy === 'owner' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            {selectedAssets.length > 0 ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedAssets.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowBulkOperations(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Bulk Operations
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setSelectedAssets([])}
                      className="text-muted-foreground"
                    >
                      Clear Selection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setShowImportDialog(true)}
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setShowExportDialog(true)}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </>
            )}
            
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Asset
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <AssetFilters
                filters={filters}
                onFiltersChange={updateFilters}
                onClearFilters={clearFilters}
                selectedCustomer={selectedCustomer}
              />
            </CardContent>
          </Card>
        )}

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Search: {filters.search}
                <button
                  onClick={() => updateFilters({ search: undefined })}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            
            {filters.warranty_expiring_days && (
              <Badge variant="secondary" className="gap-1">
                Warranty expiring in {filters.warranty_expiring_days} days
                <button
                  onClick={() => updateFilters({ warranty_expiring_days: undefined })}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}

        <Separator />

        {/* Assets Table */}
        <Card>
          <CardContent className="p-0">
            {assets.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedCustomer ? (
                    activeFiltersCount > 0 
                      ? `No assets found for ${selectedCustomer.name} with current filters.`
                      : `No assets found for ${selectedCustomer.name}. Create their first asset to get started.`
                  ) : (
                    activeFiltersCount > 0 
                      ? "No assets match your current filters. Try adjusting your search criteria."
                      : "Get started by creating your first asset."
                  )}
                </p>
                {activeFiltersCount === 0 && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    Create First Asset
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-4 font-medium w-12">
                        <Checkbox
                          checked={selectedAssets.length === assets.length && assets.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left p-4 font-medium">Asset Key</th>
                      <th className="text-left p-4 font-medium">Label</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Owner</th>
                      <th className="text-left p-4 font-medium">Location</th>
                      <th className="text-left p-4 font-medium">Warranty Expiry</th>
                      <th className="text-left p-4 font-medium">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAssets ? (
                      groupedAssets.map(([groupKey, groupAssets]) => (
                        <React.Fragment key={groupKey}>
                          {/* Group header row */}
                          <tr
                            className="bg-muted/30 border-b cursor-pointer select-none"
                            onClick={() => toggleGroup(groupKey)}
                          >
                            <td className="p-3 pl-4" colSpan={9}>
                              <div className="flex items-center gap-2">
                                {collapsedGroups.has(groupKey)
                                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                }
                                <span className="font-medium text-sm">{groupKey}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {groupAssets.length}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                          {/* Group asset rows */}
                          {!collapsedGroups.has(groupKey) && groupAssets.map((asset) => (
                            <AssetRow
                              key={asset.id}
                              asset={asset}
                              selected={selectedAssets.some(a => a.id === asset.id)}
                              onSelect={handleAssetSelect}
                              onClick={handleAssetClick}
                              getStatusBadgeVariant={getStatusBadgeVariant}
                              formatDate={formatDate}
                            />
                          ))}
                        </React.Fragment>
                      ))
                    ) : (
                      assets.map((asset) => (
                        <AssetRow
                          key={asset.id}
                          asset={asset}
                          selected={selectedAssets.some(a => a.id === asset.id)}
                          onSelect={handleAssetSelect}
                          onClick={handleAssetClick}
                          getStatusBadgeVariant={getStatusBadgeVariant}
                          formatDate={formatDate}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} assets
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAssets(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              
              <span className="text-sm">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAssets(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Drawer */}
      <AssetDrawer
        asset={selectedAsset}
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onUpdate={handleAssetUpdate}
      />

      {/* Create Asset Dialog */}
      <CreateAssetDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleAssetCreate}
      />

      {/* Import Dialog */}
      <AssetImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={handleAssetUpdate}
      />

      {/* Export Dialog */}
      <AssetExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Bulk Operations Dialog */}
      <BulkAssetOperations
        open={showBulkOperations}
        onClose={() => setShowBulkOperations(false)}
        selectedAssets={selectedAssets}
        onSuccess={handleBulkOperationSuccess}
      />
    </>
  );
}