import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssetGroupNavigationPanel } from "./JiraAssetInterface/AssetGroupNavigationPanel";
import { AssetCardGrid } from "./JiraAssetInterface/AssetCardGrid";
import { AssetDetailPanel } from "./JiraAssetInterface/AssetDetailPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import type { Asset, AssetGroup } from "@/types/asset-types";

interface JiraAssetInterfaceProps {
  groupId?: string;
}

export function JiraAssetInterface({ groupId }: JiraAssetInterfaceProps) {
  const [selectedGroup, setSelectedGroup] = useState<AssetGroup | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  const handleGroupSelect = (group: AssetGroup) => {
    setSelectedGroup(group);
    setSelectedAsset(null); // Clear asset selection when changing groups
  };

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  const handleAssetsUpdate = (updatedAssets: Asset[]) => {
    setAssets(updatedAssets);
  };

  const handleAssetUpdate = () => {
    // Trigger refresh of assets in the middle panel
    if (selectedGroup) {
      // The AssetCardGrid component will handle the refresh
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Asset Group Navigation */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <Card className="h-full">
            <ScrollArea className="h-full">
              <AssetGroupNavigationPanel
                selectedGroupId={selectedGroup?.id}
                onGroupSelect={handleGroupSelect}
                initialSelectedGroupId={groupId}
              />
            </ScrollArea>
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Middle Panel - Asset Cards */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <Card className="h-full">
            <AssetCardGrid
              selectedGroup={selectedGroup}
              selectedAssetId={selectedAsset?.id}
              onAssetSelect={handleAssetSelect}
              onAssetsUpdate={handleAssetsUpdate}
            />
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Asset Details */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
          <Card className="h-full">
            <AssetDetailPanel
              asset={selectedAsset}
              onUpdate={handleAssetUpdate}
            />
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}