import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Package,
  Upload
} from "lucide-react";
import { AssetImportDialog } from "@/components/assets/AssetImportDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetGroupService } from "@/lib/asset-group-service";
import { useQuery } from "@tanstack/react-query";
import { CreateAssetDialog } from "@/components/assets/CreateAssetDialog";
import { EditAssetGroupDialog } from "@/components/assets/EditAssetGroupDialog";
import { DeleteAssetGroupDialog } from "@/components/assets/DeleteAssetGroupDialog";
import { AssetCardGrid } from "@/components/assets/JiraAssetInterface/AssetCardGrid";
import { AssetDetailPanel } from "@/components/assets/JiraAssetInterface/AssetDetailPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import type { Asset } from "@/types/asset-types";
import { useAssetRealtime } from "@/hooks/useAssetRealtime";

const DEFAULT_GROUP_COLOR = "#6366f1";

export default function AssetGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createAssetDialogOpen, setCreateAssetDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // Enable real-time updates for assets in this group
  useAssetRealtime({ groupId: id });

  const handleAssetSelect = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
  }, []);

  const handleAssetsUpdate = useCallback((newAssets: Asset[]) => {
    setAssets(newAssets);
  }, []);

  const handleAssetUpdate = useCallback(() => {
    // Trigger assets refresh - will be handled by AssetCardGrid
  }, []);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['asset-group', id],
    queryFn: () => AssetGroupService.getAssetGroupById(id!),
  });

  if (groupLoading) {
    return (
      <div className="container-responsive pt-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        <div className="border rounded-lg h-[calc(100vh-200px)]">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container-responsive pt-6">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Asset group not found</h3>
          <p className="text-muted-foreground mb-4">
            The asset group you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/assets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive pt-6 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/incident-management/assets')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>

          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs tracking-tight shrink-0"
              style={{ backgroundColor: group.color || DEFAULT_GROUP_COLOR }}
            >
              {group.name.substring(0, 3).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span>Assets</span>
                <span>›</span>
                <span>Groups</span>
                <span>›</span>
                <span className="text-foreground font-medium">{group.name}</span>
              </div>
              <h1 className="text-2xl font-bold">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)} size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="border rounded-lg h-[calc(100vh-200px)]">
        <ResizablePanelGroup direction="horizontal">
          {/* Asset List Panel */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <AssetCardGrid
              selectedGroup={group}
              selectedAssetId={selectedAsset?.id}
              onAssetSelect={handleAssetSelect}
              onAssetsUpdate={handleAssetsUpdate}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Asset Detail Panel */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <AssetDetailPanel
              asset={selectedAsset}
              onUpdate={handleAssetUpdate}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Dialogs */}
      {group && (
        <>
          <CreateAssetDialog
            open={createAssetDialogOpen}
            onClose={() => setCreateAssetDialogOpen(false)}
            defaultGroupId={group.id}
          />
          <AssetImportDialog
            open={importDialogOpen}
            onClose={() => setImportDialogOpen(false)}
            onSuccess={() => {
              setImportDialogOpen(false);
              // Refresh will be handled by react-query
            }}
            defaultGroupId={group.id}
          />
          <EditAssetGroupDialog
            group={group}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
          <DeleteAssetGroupDialog
            group={group}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          />
        </>
      )}
    </div>
  );
}
