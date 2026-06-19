import React, { useState } from "react";
import { Edit2, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetService } from "@/lib/asset-service";
import { AssetHistoryTab } from "../AssetHistoryTab";
import { EditAssetDialog } from "../EditAssetDialog";
import type { Asset } from "@/types/asset-types";

interface AssetDetailPanelProps {
  asset: Asset | null;
  onUpdate: () => void;
}

export function AssetDetailPanel({ asset, onUpdate }: AssetDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditDialog, setShowEditDialog] = useState(false);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const isWarrantyExpiring = () => {
    return asset && AssetService.isWarrantyExpiring(asset, 30);
  };

  const isRetired = () => {
    return asset && (
      asset.status?.is_terminal || 
      asset.status?.name.toLowerCase().includes('retired') ||
      asset.status?.name.toLowerCase().includes('disposed')
    );
  };

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Package className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-semibold">Select an Asset</h3>
            <p className="text-sm text-muted-foreground">
              Choose an asset from the middle panel to view its details
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleEditSuccess = () => {
    onUpdate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{asset.label}</h2>
            <p className="text-sm text-muted-foreground">
              {asset.asset_key} • {asset.type?.name}
            </p>
          </div>
        </div>

        {/* Status and Quick Actions */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            style={{ 
              backgroundColor: asset.status?.colour,
              color: asset.status?.colour ? '#fff' : undefined
            }}
          >
            {asset.status?.name}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-4">
            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Warnings */}
              {(isWarrantyExpiring() || isRetired()) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-1">
                    {isRetired() && (
                      <p className="text-sm font-medium text-destructive">
                        This asset is retired or disposed and should not be used.
                      </p>
                    )}
                    {isWarrantyExpiring() && (
                      <p className="text-sm">
                        Warranty expires soon. Consider renewal or replacement planning.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Asset Key</label>
                    <p className="text-sm text-muted-foreground font-mono">{asset.asset_key}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Label</label>
                    <p className="text-sm text-muted-foreground">{asset.label}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <p className="text-sm text-muted-foreground">{asset.type?.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Assigned To</label>
                    <p className="text-sm text-muted-foreground">
                      {asset.device_user?.name || 'Unassigned'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <p className="text-sm text-muted-foreground">{asset.location || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Serial Number</label>
                    <p className="text-sm text-muted-foreground font-mono">
                      {asset.serial_number || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Financial Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Purchase Date</label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(asset.purchase_date)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Warranty Expiry</label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(asset.warranty_expiry)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Cost</label>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(asset.cost)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {asset.notes && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Notes
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {asset.notes}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              {/* Metadata */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Metadata
                </h3>
                
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <span>Created: {formatDate(asset.created_at)}</span>
                  </div>
                  <div>
                    <span>Last Updated: {formatDate(asset.updated_at)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <AssetHistoryTab asset={asset} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <EditAssetDialog
        asset={asset}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}