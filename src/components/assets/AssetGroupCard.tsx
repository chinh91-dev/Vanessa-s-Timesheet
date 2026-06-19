import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetGroup } from "@/types/asset-types";
import { Edit, Trash2, FolderOpen, Building, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssetGroupCardProps {
  group: AssetGroup;
  onEdit: (group: AssetGroup) => void;
  onDelete: (group: AssetGroup) => void;
  onViewAssets: (group: AssetGroup) => void;
  assetCount?: number;
}

const AssetGroupCard: React.FC<AssetGroupCardProps> = ({
  group,
  onEdit,
  onDelete,
  onViewAssets,
  assetCount = 0
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
            <div>
              <CardTitle className="text-lg">{group.name}</CardTitle>
              {group.customer && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Building className="h-3 w-3" />
                  <span>{group.customer.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewAssets(group)}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              View Assets
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(group)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(group)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {group.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {group.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {assetCount} {assetCount === 1 ? 'asset' : 'assets'}
            </span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            Order: {group.sort_order}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetGroupCard;