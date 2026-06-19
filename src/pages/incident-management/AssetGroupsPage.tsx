import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Filter, ArrowUpDown, TrendingUp, MoreHorizontal, Package, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreateAssetGroupDialog } from "@/components/assets/CreateAssetGroupDialog";
import { AssetGroupService } from "@/lib/asset-group-service";
import { useQuery } from "@tanstack/react-query";
import type { AssetGroup } from "@/types/asset-types";
import { EditAssetGroupDialog } from "@/components/assets/EditAssetGroupDialog";
import { useAssetRealtime } from "@/hooks/useAssetRealtime";

const DEFAULT_GROUP_COLOR = "#6366f1";

type SortKey = 'name' | 'asset_count' | 'sort_order';
type SortDir = 'asc' | 'desc';

export default function AssetGroupsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingGroup, setEditingGroup] = useState<AssetGroup | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filter state
  const [customerFilter, setCustomerFilter] = useState<string[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState<SortKey>('sort_order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const navigate = useNavigate();

  // Enable real-time updates for assets
  useAssetRealtime();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['asset-groups'],
    queryFn: () => AssetGroupService.getAssetGroups(),
  });

  // Derive unique customers from loaded groups
  const customers = useMemo(() => {
    const map = new Map<string, string>();
    groups?.forEach(g => {
      if (g.customer) map.set(g.customer.id, g.customer.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [groups]);

  const activeFilterCount = customerFilter.length + (showActiveOnly ? 1 : 0);

  const filteredGroups = useMemo(() => {
    let result = groups?.filter(group => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        group.name.toLowerCase().includes(searchLower) ||
        group.description?.toLowerCase().includes(searchLower) ||
        group.customer?.name.toLowerCase().includes(searchLower);

      const matchesCustomer =
        customerFilter.length === 0 ||
        (group.customer_id != null && customerFilter.includes(group.customer_id));

      const matchesActive = !showActiveOnly || group.is_active;

      return matchesSearch && matchesCustomer && matchesActive;
    }) ?? [];

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'asset_count') {
        cmp = (a.asset_count ?? 0) - (b.asset_count ?? 0);
      } else {
        cmp = a.sort_order - b.sort_order;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [groups, searchTerm, customerFilter, showActiveOnly, sortBy, sortDir]);

  const handleSortClick = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setCustomerFilter([]);
    setShowActiveOnly(false);
  };

  if (isLoading) {
    return (
      <div className="container-responsive pt-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Search Skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Table Skeleton */}
        <Card>
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-8" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-8" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Asset Groups</h1>
            <p className="text-muted-foreground">
              Create asset groups when customers request asset management services
            </p>
          </div>
        <Button size="lg" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-5 w-5" />
          New Group
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search groups by name, description, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted rounded-full"
                onClick={() => setSearchTerm("")}
              >
                ×
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={activeFilterCount > 0 ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Filters</span>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={clearFilters}
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {customers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Customer</Label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {customers.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`customer-${c.id}`}
                            checked={customerFilter.includes(c.id)}
                            onCheckedChange={(checked) => {
                              setCustomerFilter(prev =>
                                checked
                                  ? [...prev, c.id]
                                  : prev.filter(id => id !== c.id)
                              );
                            }}
                          />
                          <Label
                            htmlFor={`customer-${c.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {c.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="active-only"
                    checked={showActiveOnly}
                    onCheckedChange={(checked) => setShowActiveOnly(!!checked)}
                  />
                  <Label htmlFor="active-only" className="text-sm cursor-pointer">
                    Active groups only
                  </Label>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {([
                  { key: 'sort_order' as SortKey, label: 'Sort Order' },
                  { key: 'name' as SortKey, label: 'Name' },
                  { key: 'asset_count' as SortKey, label: 'Asset Count' },
                ]).map(option => (
                  <DropdownMenuItem
                    key={option.key}
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => handleSortClick(option.key)}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.key && (
                      sortDir === 'asc'
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {(searchTerm || activeFilterCount > 0) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Found {filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''}
            {searchTerm && <> matching "{searchTerm}"</>}
          </div>
        )}
      </div>

      {/* Groups Table */}
      <Card>
        <div className="p-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No asset groups found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || activeFilterCount > 0
                  ? "No groups match your search or filters"
                  : "Create asset groups when customers request asset management services"}
              </p>
              {!searchTerm && activeFilterCount === 0 && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              )}
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/incident-management/assets/groups/${group.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs tracking-tight shrink-0"
                          style={{ backgroundColor: group.color || DEFAULT_GROUP_COLOR }}
                        >
                          {group.name.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{group.name}</div>
                          {group.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {group.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.customer ? (
                        <div>
                          <div className="font-medium">{group.customer.name}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No customer</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {group.asset_count ?? 0} {(group.asset_count ?? 0) === 1 ? 'asset' : 'assets'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {group.sort_order}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/incident-management/assets/groups/${group.id}`);
                          }}>
                            View assets
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroup(group);
                          }}>
                            Edit group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Dialogs */}
      <CreateAssetGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingGroup && (
        <EditAssetGroupDialog
          group={editingGroup}
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
        />
      )}
    </div>
  );
}
