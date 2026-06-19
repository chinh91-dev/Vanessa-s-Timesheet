import React, { useState, useEffect } from "react";
import { Plus, Trash2, Link, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AssetService } from "@/lib/asset-service";
import { AssetPicker } from "./AssetPicker";
import type { Asset, AssetRelationship } from "@/types/asset-types";
import { toast } from "sonner";

interface AssetRelationshipsTabProps {
  asset: Asset;
  onUpdate: () => void;
}

const RELATIONSHIP_TYPES = [
  { value: "contains", label: "Contains", description: "This asset contains the other asset" },
  { value: "part_of", label: "Part of", description: "This asset is part of the other asset" },
  { value: "connects_to", label: "Connects to", description: "This asset connects to the other asset" },
  { value: "depends_on", label: "Depends on", description: "This asset depends on the other asset" },
  { value: "related_to", label: "Related to", description: "General relationship between assets" },
];

export function AssetRelationshipsTab({ asset, onUpdate }: AssetRelationshipsTabProps) {
  const [relationships, setRelationships] = useState<AssetRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [selectedRelation, setSelectedRelation] = useState("");

  useEffect(() => {
    loadRelationships();
  }, [asset.id]);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      const data = await AssetService.getAssetRelationships(asset.id);
      setRelationships(data);
    } catch (error) {
      console.error('Failed to load relationships:', error);
      toast.error('Failed to load asset relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRelationship = async () => {
    if (!selectedAssets.length || !selectedRelation) {
      toast.error('Please select an asset and relationship type');
      return;
    }

    try {
      for (const targetAsset of selectedAssets) {
        await AssetService.addAssetRelationship(asset.id, targetAsset.id, selectedRelation);
      }
      
      toast.success(`Added ${selectedAssets.length} relationship(s)`);
      setSelectedAssets([]);
      setSelectedRelation("");
      setAddDialogOpen(false);
      loadRelationships();
      onUpdate();
    } catch (error) {
      console.error('Failed to add relationship:', error);
      toast.error('Failed to add relationship');
    }
  };

  const handleRemoveRelationship = async (relationshipId: string) => {
    try {
      await AssetService.removeAssetRelationship(relationshipId);
      toast.success('Relationship removed');
      loadRelationships();
      onUpdate();
    } catch (error) {
      console.error('Failed to remove relationship:', error);
      toast.error('Failed to remove relationship');
    }
  };

  const getRelationshipLabel = (relation: string) => {
    const type = RELATIONSHIP_TYPES.find(t => t.value === relation);
    return type?.label || relation;
  };

  const isWarrantyExpiring = (targetAsset: Asset) => {
    return AssetService.isWarrantyExpiring(targetAsset, 30);
  };

  const isRetired = (targetAsset: Asset) => {
    return targetAsset.status?.is_terminal || 
           targetAsset.status?.name.toLowerCase().includes('retired') ||
           targetAsset.status?.name.toLowerCase().includes('disposed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Package className="h-6 w-6 animate-pulse mr-2" />
        <span>Loading relationships...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Asset Relationships</h3>
          <p className="text-sm text-muted-foreground">
            Manage connections between this asset and other assets
          </p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Relationship
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Asset Relationship</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <Select value={selectedRelation} onValueChange={setSelectedRelation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Select Assets</Label>
                <AssetPicker
                  selectedAssets={selectedAssets}
                  onSelectionChange={setSelectedAssets}
                  excludeAssetIds={[asset.id]}
                  multiSelect={true}
                  placeholder="Search for assets to link..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddRelationship}
                  disabled={!selectedAssets.length || !selectedRelation}
                >
                  Add Relationship
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {relationships.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <Link className="h-6 w-6" />
            </div>
          </div>
          <p className="text-sm font-medium">No relationships defined</p>
          <p className="text-xs mt-1">
            Add relationships to connect this asset with related assets in your inventory.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {relationships.map((relationship) => (
            <div key={relationship.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getRelationshipLabel(relationship.relation)}
                    </Badge>
                    <Link className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {relationship.destination_asset && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">
                          {relationship.destination_asset.asset_key}
                        </span>
                        <Badge
                          variant="outline"
                          style={{ 
                            backgroundColor: relationship.destination_asset.status?.colour,
                            color: relationship.destination_asset.status?.colour ? '#fff' : undefined
                          }}
                          className="text-xs"
                        >
                          {relationship.destination_asset.status?.name}
                        </Badge>
                      </div>
                      
                      <p className="text-sm font-medium">
                        {relationship.destination_asset.label}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{relationship.destination_asset.type?.name}</span>
                      </div>

                      {/* Warnings */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {isRetired(relationship.destination_asset) && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Retired
                          </Badge>
                        )}
                        {isWarrantyExpiring(relationship.destination_asset) && (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Warranty Expiring
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRelationship(relationship.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mini Network Visualization */}
      {relationships.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Relationship Network</h4>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {/* Current Asset (Center) */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary/20 border-2 border-primary rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-medium mt-1 text-center max-w-20 truncate">
                    {asset.asset_key}
                  </span>
                </div>
                
                {/* Connected Assets */}
                {relationships.slice(0, 4).map((rel, index) => (
                  <React.Fragment key={rel.id}>
                    <div className="flex items-center">
                      <div className="h-px w-8 bg-border"></div>
                      <span className="text-xs px-2 py-1 bg-background border rounded">
                        {getRelationshipLabel(rel.relation)}
                      </span>
                      <div className="h-px w-8 bg-border"></div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-secondary/20 border-2 border-secondary rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-secondary-foreground" />
                      </div>
                      <span className="text-xs font-medium mt-1 text-center max-w-20 truncate">
                        {rel.destination_asset?.asset_key}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
                
                {relationships.length > 4 && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-muted border-2 border-dashed rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium">
                        +{relationships.length - 4}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      more
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}