import React, { useState, useEffect } from "react";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetService } from "@/lib/asset-service";
import type { Asset, AssetAttributeDef, AssetAttributeValue } from "@/types/asset-types";
import { toast } from "sonner";

interface AssetAttributesTabProps {
  asset: Asset;
  onUpdate: () => void;
}

export function AssetAttributesTab({ asset, onUpdate }: AssetAttributesTabProps) {
  const [definitions, setDefinitions] = useState<AssetAttributeDef[]>([]);
  const [values, setValues] = useState<AssetAttributeValue[]>([]);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAttributeData();
  }, [asset.id, asset.type_id]);

  const loadAttributeData = async () => {
    try {
      setLoading(true);
      const [defs, vals] = await Promise.all([
        AssetService.getAssetAttributeDefinitions(asset.type_id),
        AssetService.getAssetAttributes(asset.id)
      ]);
      
      setDefinitions(defs);
      setValues(vals);
      
      // Initialize editing values with current values
      const editingData: Record<string, any> = {};
      defs.forEach(def => {
        const existingValue = vals.find(v => v.attr_def_id === def.id);
        if (existingValue) {
          editingData[def.id] = AssetService.formatAssetValue(existingValue);
        } else {
          editingData[def.id] = '';
        }
      });
      setEditingValues(editingData);
    } catch (error) {
      console.error('Failed to load attribute data:', error);
      toast.error('Failed to load asset attributes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await AssetService.updateAssetAttributes(asset.id, editingValues);
      await loadAttributeData(); // Reload to get latest values
      onUpdate(); // Notify parent of changes
      toast.success('Asset attributes updated successfully');
    } catch (error) {
      console.error('Failed to save attributes:', error);
      toast.error('Failed to save asset attributes');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (defId: string, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [defId]: value
    }));
  };

  const renderAttributeInput = (def: AssetAttributeDef) => {
    const value = editingValues[def.id] || '';
    
    switch (def.data_type) {
      case 'text':
      case 'url':
        return (
          <Input
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            placeholder={`Enter ${def.name.toLowerCase()}`}
            type={def.data_type === 'url' ? 'url' : 'text'}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            placeholder="0"
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value === 'true' || value === true}
              onCheckedChange={(checked) => handleValueChange(def.id, checked.toString())}
            />
            <Label className="text-sm text-muted-foreground">
              {value === 'true' || value === true ? 'Yes' : 'No'}
            </Label>
          </div>
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            placeholder={`Enter ${def.name.toLowerCase()}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading attributes...</span>
      </div>
    );
  }

  if (definitions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto bg-muted rounded-lg flex items-center justify-center">
            <Plus className="h-6 w-6" />
          </div>
        </div>
        <p className="text-sm font-medium">No custom attributes defined</p>
        <p className="text-xs mt-1">
          Contact your administrator to set up custom attributes for {asset.type?.name} assets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Custom Attributes</h3>
          <p className="text-sm text-muted-foreground">
            Manage custom properties for this {asset.type?.name?.toLowerCase()} asset
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="sm"
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        {definitions.map((def) => (
          <div key={def.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={def.id} className="font-medium">
                {def.name}
              </Label>
              {def.is_required && (
                <Badge variant="secondary" className="text-xs">Required</Badge>
              )}
              {def.is_unique && (
                <Badge variant="outline" className="text-xs">Unique</Badge>
              )}
            </div>
            
            {renderAttributeInput(def)}
            
            <div className="text-xs text-muted-foreground">
              Type: {def.data_type}
              {def.is_required && ' • Required'}
              {def.is_unique && ' • Must be unique'}
            </div>
          </div>
        ))}
      </div>

      {definitions.some(def => def.is_required) && (
        <Alert>
          <AlertDescription className="text-sm">
            Some attributes are marked as required. Make sure to fill them in before saving.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}