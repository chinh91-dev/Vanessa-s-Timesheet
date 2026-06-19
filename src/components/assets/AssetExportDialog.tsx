import React, { useState } from "react";
import { Download, FileText, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AssetService } from "@/lib/asset-service";
import type { AssetType, AssetStatus, AssetFilters } from "@/types/asset-types";
import { toast } from "sonner";

interface AssetExportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ExportOptions {
  format: 'csv' | 'json';
  includeAttributes: boolean;
  includeRelationships: boolean;
  includeHistory: boolean;
  filters: AssetFilters;
}

export function AssetExportDialog({ open, onClose }: AssetExportDialogProps) {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeAttributes: true,
    includeRelationships: false,
    includeHistory: false,
    filters: {}
  });

  React.useEffect(() => {
    if (open) {
      loadReferenceData();
    }
  }, [open]);

  const loadReferenceData = async () => {
    try {
      const [types, statuses] = await Promise.all([
        AssetService.getAssetTypes(),
        AssetService.getAssetStatuses()
      ]);
      setAssetTypes(types);
      setAssetStatuses(statuses);
    } catch (error) {
      console.error('Failed to load reference data:', error);
      toast.error('Failed to load reference data');
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Get assets with filters
      const response = await AssetService.getAssets(exportOptions.filters, 1, 10000);
      const assets = response.assets;

      if (assets.length === 0) {
        toast.error('No assets found matching the selected filters');
        return;
      }

      if (exportOptions.format === 'csv') {
        await exportCSV(assets);
      } else {
        await exportJSON(assets);
      }

      toast.success(`Successfully exported ${assets.length} assets`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async (assets: any[]) => {
    const headers = [
      'Asset Key',
      'Label', 
      'Type',
      'Status',
      'Owner',
      'Location',
      'Serial Number',
      'Purchase Date',
      'Warranty Expiry',
      'Cost (AUD)',
      'Notes',
      'Created At',
      'Updated At'
    ];

    // Add attribute columns if requested. Single batched query via
    // AssetService.getAssetAttributesByIds replaces the prior N+1 loop.
    let attributeColumns: string[] = [];
    let attributesByAsset: Map<string, Awaited<ReturnType<typeof AssetService.getAssetAttributes>>> = new Map();
    if (exportOptions.includeAttributes && assets.length > 0) {
      const typedIds = assets.filter((a) => a.type_id).map((a) => a.id);
      try {
        attributesByAsset = await AssetService.getAssetAttributesByIds(typedIds);
      } catch (err) {
        console.warn('[AssetExport] batched attribute fetch failed:', err);
      }
      const allAttributes = new Set<string>();
      attributesByAsset.forEach((attrs) => {
        attrs.forEach((attr) => {
          if (attr.definition?.name) allAttributes.add(attr.definition.name);
        });
      });
      attributeColumns = Array.from(allAttributes);
      headers.push(...attributeColumns.map((col) => `Attr: ${col}`));
    }

    const rows = await Promise.all(assets.map(async (asset) => {
      const row = [
        asset.asset_key || '',
        asset.label || '',
        asset.type?.name || '',
        asset.status?.name || '',
        asset.owner?.full_name || asset.owner?.email || '',
        asset.location || '',
        asset.serial_number || '',
        asset.purchase_date || '',
        asset.warranty_expiry || '',
        asset.cost?.toString() || '',
        asset.notes || '',
        new Date(asset.created_at).toLocaleDateString('en-AU'),
        new Date(asset.updated_at).toLocaleDateString('en-AU')
      ];

      // Add attribute values if requested. Reuse the batched fetch from
      // earlier in the same export call to avoid a second N+1 round.
      if (exportOptions.includeAttributes) {
        const attrs = attributesByAsset.get(asset.id) || [];
        const attrMap = new Map(attrs.map(attr => [attr.definition?.name, AssetService.formatAssetValue(attr)]));
        attributeColumns.forEach(col => {
          row.push(attrMap.get(col) || '');
        });
      }

      return row;
    }));

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'assets_export.csv', 'text/csv');
  };

  const exportJSON = async (assets: any[]) => {
    // Pre-fetch all attribute values in one batched query so the per-asset
    // loop below doesn't issue O(N) round trips for the attributes column.
    let attributesByAsset: Map<string, Awaited<ReturnType<typeof AssetService.getAssetAttributes>>> = new Map();
    if (exportOptions.includeAttributes && assets.length > 0) {
      try {
        attributesByAsset = await AssetService.getAssetAttributesByIds(assets.map((a) => a.id));
      } catch (err) {
        console.warn('[AssetExport][JSON] batched attribute fetch failed:', err);
      }
    }

    const enrichedAssets = await Promise.all(assets.map(async (asset) => {
      const exportAsset = { ...asset };

      if (exportOptions.includeAttributes) {
        exportAsset.attributes = attributesByAsset.get(asset.id) || [];
      }

      if (exportOptions.includeRelationships) {
        try {
          const relationships = await AssetService.getAssetRelationships(asset.id);
          exportAsset.relationships = relationships;
        } catch (error) {
          exportAsset.relationships = [];
        }
      }

      if (exportOptions.includeHistory) {
        try {
          const history = await AssetService.getAssetHistory(asset.id);
          exportAsset.history = history;
        } catch (error) {
          exportAsset.history = [];
        }
      }

      return exportAsset;
    }));

    const jsonContent = JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalAssets: enrichedAssets.length,
      includeAttributes: exportOptions.includeAttributes,
      includeRelationships: exportOptions.includeRelationships,
      includeHistory: exportOptions.includeHistory,
      assets: enrichedAssets
    }, null, 2);

    downloadFile(jsonContent, 'assets_export.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateFilters = (key: keyof AssetFilters, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  };

  const clearFilters = () => {
    setExportOptions(prev => ({
      ...prev,
      filters: {}
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Assets</DialogTitle>
          <DialogDescription>
            Export your asset data in CSV or JSON format with optional filters and additional data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select
              value={exportOptions.format}
              onValueChange={(value: 'csv' | 'json') => 
                setExportOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>CSV (Comma Separated Values)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>JSON (JavaScript Object Notation)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <Label>Include Additional Data</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAttributes"
                  checked={exportOptions.includeAttributes}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeAttributes: !!checked }))
                  }
                />
                <Label htmlFor="includeAttributes" className="text-sm">
                  Custom Attributes
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRelationships"
                  checked={exportOptions.includeRelationships}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeRelationships: !!checked }))
                  }
                  disabled={exportOptions.format === 'csv'}
                />
                <Label htmlFor="includeRelationships" className="text-sm">
                  Asset Relationships {exportOptions.format === 'csv' && '(JSON only)'}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHistory"
                  checked={exportOptions.includeHistory}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeHistory: !!checked }))
                  }
                  disabled={exportOptions.format === 'csv'}
                />
                <Label htmlFor="includeHistory" className="text-sm">
                  Asset History {exportOptions.format === 'csv' && '(JSON only)'}
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Export Filters
              </Label>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Asset Type Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Asset Type</Label>
                <Select
                  value={exportOptions.filters.type_ids?.[0] || ''}
                  onValueChange={(value) => 
                    updateFilters('type_ids', value ? [value] : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {assetTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={exportOptions.filters.status_ids?.[0] || ''}
                  onValueChange={(value) => 
                    updateFilters('status_ids', value ? [value] : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    {assetStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: status.colour }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(exportOptions.filters.type_ids?.length || exportOptions.filters.status_ids?.length) && (
              <div className="flex flex-wrap gap-2 pt-2">
                {exportOptions.filters.type_ids?.map(typeId => {
                  const type = assetTypes.find(t => t.id === typeId);
                  return type ? (
                    <Badge key={typeId} variant="secondary" className="text-xs">
                      Type: {type.name}
                    </Badge>
                  ) : null;
                })}
                {exportOptions.filters.status_ids?.map(statusId => {
                  const status = assetStatuses.find(s => s.id === statusId);
                  return status ? (
                    <Badge key={statusId} variant="secondary" className="text-xs">
                      Status: {status.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : `Export ${exportOptions.format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}