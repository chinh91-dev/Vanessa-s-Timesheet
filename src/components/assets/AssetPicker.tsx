import React, { useState, useEffect } from "react";
import { Search, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetService } from "@/lib/asset-service";
import type { Asset, AssetFilters } from "@/types/asset-types";
import { toast } from "sonner";

interface AssetPickerProps {
  selectedAssets?: Asset[];
  onSelectionChange: (assets: Asset[]) => void;
  excludeAssetIds?: string[];
  multiSelect?: boolean;
  placeholder?: string;
}

export function AssetPicker({ 
  selectedAssets = [], 
  onSelectionChange, 
  excludeAssetIds = [],
  multiSelect = false,
  placeholder = "Search for assets..."
}: AssetPickerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [search]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const filters: AssetFilters = search ? { search } : {};
      const response = await AssetService.getAssets(filters, 1, 50);
      
      // Filter out excluded assets and already selected assets
      const filteredAssets = response.assets.filter(asset => 
        !excludeAssetIds.includes(asset.id) &&
        !selectedAssets.some(selected => selected.id === asset.id)
      );
      
      setAssets(filteredAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = (asset: Asset) => {
    if (multiSelect) {
      onSelectionChange([...selectedAssets, asset]);
    } else {
      onSelectionChange([asset]);
    }
  };

  const handleAssetRemove = (assetId: string) => {
    onSelectionChange(selectedAssets.filter(asset => asset.id !== assetId));
  };

  const isWarrantyExpiring = (asset: Asset) => {
    return AssetService.isWarrantyExpiring(asset, 30);
  };

  const isRetired = (asset: Asset) => {
    return asset.status?.is_terminal || 
           asset.status?.name.toLowerCase().includes('retired') ||
           asset.status?.name.toLowerCase().includes('disposed');
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selected Assets */}
      {selectedAssets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Assets:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedAssets.map((asset) => (
              <Badge 
                key={asset.id} 
                variant="secondary" 
                className="gap-2 pr-2"
              >
                <span className="font-mono text-xs">{asset.asset_key}</span>
                <span>{asset.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleAssetRemove(asset.id)}
                >
                  ×
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Asset List */}
      <ScrollArea className="h-64 border rounded-md">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Package className="h-4 w-4 animate-pulse mr-2" />
              <span className="text-sm">Loading assets...</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Package className="h-4 w-4 mr-2" />
              <span className="text-sm">
                {search ? 'No assets found' : 'No assets available'}
              </span>
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleAssetSelect(asset)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">
                        {asset.asset_key}
                      </span>
                      <Badge
                        variant="outline"
                        style={{ 
                          backgroundColor: asset.status?.colour,
                          color: asset.status?.colour ? '#fff' : undefined
                        }}
                        className="text-xs"
                      >
                        {asset.status?.name}
                      </Badge>
                    </div>
                    
                    <p className="text-sm font-medium truncate">
                      {asset.label}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{asset.type?.name}</span>
                      {asset.location && (
                        <>
                          <span>•</span>
                          <span>{asset.location}</span>
                        </>
                      )}
                    </div>

                    {/* Warnings */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {isRetired(asset) && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Retired
                        </Badge>
                      )}
                      {isWarrantyExpiring(asset) && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Warranty Expiring
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Warnings about retired assets */}
      {assets.some(isRetired) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Some assets shown are retired or disposed. Consider their current status before creating relationships.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}