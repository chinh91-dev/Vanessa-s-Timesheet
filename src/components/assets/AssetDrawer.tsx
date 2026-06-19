import React, { useState, useEffect } from "react";
import { X, Edit2, Package, AlertTriangle, Trash2 } from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetService } from "@/lib/asset-service";
import { AssetHistoryTab } from "./AssetHistoryTab";
import { EditAssetDialog } from "./EditAssetDialog";
import { DeleteAssetDialog } from "./DeleteAssetDialog";
import { useAuth } from "@/context/AuthContext";
import { isManagerOrAbove } from "@/utils/roles";
import type { Asset } from "@/types/asset-types";

interface AssetDrawerProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function AssetDrawer({ asset, open, onClose, onUpdate }: AssetDrawerProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    const checkDeletePermission = async () => {
      const hasPermission = await isManagerOrAbove(user);
      setCanDelete(hasPermission);
    };
    checkDeletePermission();
  }, [user]);

  if (!asset) return null;

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
    return AssetService.isWarrantyExpiring(asset, 30);
  };

  const isRetired = () => {
    return asset.status?.is_terminal || 
           asset.status?.name.toLowerCase().includes('retired') ||
           asset.status?.name.toLowerCase().includes('disposed');
  };

  const handleEditSuccess = () => {
    onUpdate();
  };

  const handleDeleteSuccess = () => {
    onClose();
    onUpdate();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">{asset.label}</SheetTitle>
                <SheetDescription className="text-left">
                  {asset.asset_key} • {asset.type?.name}
                </SheetDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <TabsContent value="overview" className="space-y-6">
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
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                    {canDelete && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

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

              <TabsContent value="history" className="space-y-4">
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

        {/* Delete Dialog */}
        <DeleteAssetDialog
          asset={asset}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onSuccess={handleDeleteSuccess}
        />
      </SheetContent>
    </Sheet>
  );
}