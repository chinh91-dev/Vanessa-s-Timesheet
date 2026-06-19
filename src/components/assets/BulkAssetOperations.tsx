import React, { useState } from "react";
import { Settings, Users, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AssetService } from "@/lib/asset-service";
import type { Asset, AssetStatus } from "@/types/asset-types";
import { toast } from "sonner";

interface BulkAssetOperationsProps {
  open: boolean;
  onClose: () => void;
  selectedAssets: Asset[];
  onSuccess: () => void;
}

type OperationType = 'status_update' | 'bulk_delete' | 'assign_owner';

interface BulkOperation {
  type: OperationType;
  label: string;
  description: string;
  icon: React.ReactNode;
  destructive?: boolean;
}

const BULK_OPERATIONS: BulkOperation[] = [
  {
    type: 'status_update',
    label: 'Update Status',
    description: 'Change the status of selected assets',
    icon: <Settings className="h-4 w-4" />
  },
  {
    type: 'assign_owner',
    label: 'Assign Owner',
    description: 'Assign an owner to selected assets',
    icon: <Users className="h-4 w-4" />
  },
  {
    type: 'bulk_delete',
    label: 'Delete Assets',
    description: 'Permanently delete selected assets',
    icon: <Trash2 className="h-4 w-4" />,
    destructive: true
  }
];

export function BulkAssetOperations({ open, onClose, selectedAssets, onSuccess }: BulkAssetOperationsProps) {
  const [selectedOperation, setSelectedOperation] = useState<OperationType | ''>('');
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  React.useEffect(() => {
    if (open) {
      loadReferenceData();
    }
  }, [open]);

  const loadReferenceData = async () => {
    try {
      const statuses = await AssetService.getAssetStatuses();
      setAssetStatuses(statuses);
    } catch (error) {
      console.error('Failed to load reference data:', error);
      toast.error('Failed to load reference data');
    }
  };

  const handleOperation = async () => {
    if (!selectedOperation || selectedAssets.length === 0) return;

    setProcessing(true);
    setProgress(0);
    setResults(null);

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        
        try {
          switch (selectedOperation) {
            case 'status_update':
              if (!selectedStatusId) {
                throw new Error('No status selected');
              }
              await AssetService.updateAsset({
                id: asset.id,
                status_id: selectedStatusId
              });
              break;
              
            case 'bulk_delete':
              await AssetService.deleteAsset(asset.id);
              break;
              
            case 'assign_owner':
              // This would need user picker implementation
              // For now, just update with null to unassign
              await AssetService.updateAsset({
                id: asset.id,
                device_user_id: undefined
              });
              break;
          }
          successful++;
        } catch (error: any) {
          failed++;
          errors.push(`${asset.asset_key}: ${error.message || 'Unknown error'}`);
        }
        
        setProgress(((i + 1) / selectedAssets.length) * 100);
      }

      setResults({ success: successful, failed, errors });
      
      if (successful > 0) {
        toast.success(`Successfully processed ${successful} assets`);
        onSuccess();
      }
      
      if (failed > 0) {
        toast.error(`Failed to process ${failed} assets`);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast.error('Bulk operation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setSelectedOperation('');
      setSelectedStatusId('');
      setResults(null);
      setProgress(0);
      onClose();
    }
  };

  const canProceed = () => {
    if (!selectedOperation || selectedAssets.length === 0) return false;
    
    switch (selectedOperation) {
      case 'status_update':
        return !!selectedStatusId;
      case 'bulk_delete':
      case 'assign_owner':
        return true;
      default:
        return false;
    }
  };

  const getOperationWarning = () => {
    if (!selectedOperation) return null;
    
    switch (selectedOperation) {
      case 'bulk_delete':
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. All selected assets and their 
              relationships will be permanently deleted from the system.
            </AlertDescription>
          </Alert>
        );
      
      case 'status_update':
        const terminalStatus = assetStatuses.find(s => s.id === selectedStatusId)?.is_terminal;
        if (terminalStatus) {
          return (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are setting assets to a terminal status. This may affect their availability 
                for new relationships and assignments.
              </AlertDescription>
            </Alert>
          );
        }
        break;
    }
    
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Asset Operations</DialogTitle>
          <DialogDescription>
            Perform bulk operations on {selectedAssets.length} selected assets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Assets Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Selected Assets ({selectedAssets.length})</h4>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedAssets.map((asset) => (
                <Badge key={asset.id} variant="outline" className="text-xs">
                  {asset.asset_key}
                </Badge>
              ))}
            </div>
          </div>

          {/* Operation Selection */}
          <div className="space-y-4">
            <Label>Select Operation</Label>
            <div className="grid gap-3">
              {BULK_OPERATIONS.map((operation) => (
                <div
                  key={operation.type}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOperation === operation.type
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  } ${operation.destructive ? 'border-red-200 hover:border-red-300' : ''}`}
                  onClick={() => setSelectedOperation(operation.type)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${operation.destructive ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {operation.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${operation.destructive ? 'text-red-900' : ''}`}>
                        {operation.label}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {operation.description}
                      </p>
                    </div>
                    {selectedOperation === operation.type && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operation-specific Configuration */}
          {selectedOperation === 'status_update' && (
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {assetStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.colour }}
                        />
                        {status.name}
                        {status.is_terminal && (
                          <Badge variant="outline" className="text-xs ml-2">
                            Terminal
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Operation Warning */}
          {getOperationWarning()}

          {/* Processing Progress */}
          {processing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing assets...</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Operation Results</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {results.success} successful
                    </span>
                  </div>
                  {results.failed > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">
                        {results.failed} failed
                      </span>
                    </div>
                  )}
                </div>
                
                {results.errors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                    <div className="text-xs text-red-700 space-y-1 max-h-20 overflow-y-auto">
                      {results.errors.map((error, index) => (
                        <p key={index}>• {error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={processing}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button 
              onClick={handleOperation} 
              disabled={!canProceed() || processing}
              variant={selectedOperation === 'bulk_delete' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : `Execute Operation`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}