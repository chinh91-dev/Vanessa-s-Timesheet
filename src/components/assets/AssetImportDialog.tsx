import React, { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AssetService } from "@/lib/asset-service";
import { AssetGroupService } from "@/lib/asset-group-service";
import type { AssetType, AssetStatus, AssetGroup, CreateAssetRequest } from "@/types/asset-types";
import { toast } from "sonner";

interface AssetImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultGroupId?: string;
}

interface ImportRow {
  rowNumber: number;
  data: CreateAssetRequest;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

export function AssetImportDialog({ open, onClose, onSuccess, defaultGroupId }: AssetImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      loadReferenceData();
    }
  }, [open]);

  const loadReferenceData = async () => {
    try {
      const [types, statuses, groups] = await Promise.all([
        AssetService.getAssetTypes(),
        AssetService.getAssetStatuses(),
        AssetGroupService.getAssetGroups()
      ]);
      setAssetTypes(types);
      setAssetStatuses(statuses);
      setAssetGroups(groups);
    } catch (error) {
      console.error('Failed to load reference data:', error);
      toast.error('Failed to load reference data');
    }
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      parseCSVFile(selectedFile);
    }
  }, []);

  const parseCSVFile = async (file: File) => {
    try {
      const text = await file.text();
      // Filter out empty lines and comment lines (starting with #)
      const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      
      if (lines.length < 2) {
        toast.error('CSV file must contain at least a header row and one data row');
        return;
      }

      // Clean header names - remove asterisks and extra whitespace
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\*/g, ''));
      const requiredHeaders = ['label', 'type_name', 'status_name'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setValidationErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
        return;
      }

      const rows: ImportRow[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        // Validate and convert row data
        const assetType = assetTypes.find(t => t.name.toLowerCase() === rowData.type_name?.toLowerCase());
        const assetStatus = assetStatuses.find(s => s.name.toLowerCase() === rowData.status_name?.toLowerCase());

        if (!assetType) {
          errors.push(`Row ${i + 1}: Invalid asset type '${rowData.type_name}'`);
          continue;
        }

        if (!assetStatus) {
          errors.push(`Row ${i + 1}: Invalid status '${rowData.status_name}'`);
          continue;
        }

        // Use defaultGroupId - it's required when importing from within a group
        if (!defaultGroupId) {
          errors.push(`Row ${i + 1}: No group specified for import`);
          continue;
        }

        const assetData: CreateAssetRequest = {
          label: rowData.label,
          type_id: assetType.id,
          status_id: assetStatus.id,
          group_id: defaultGroupId,
          location: rowData.location || undefined,
          serial_number: rowData.serial_number || undefined,
          purchase_date: rowData.purchase_date || undefined,
          warranty_expiry: rowData.warranty_expiry || undefined,
          notes: rowData.notes || undefined,
        };

        rows.push({
          rowNumber: i + 1,
          data: assetData,
          status: 'pending'
        });
      }

      setImportRows(rows);
      setValidationErrors(errors);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      toast.error('Failed to parse CSV file');
    }
  };

  const handleImport = async () => {
    if (importRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    
    const updatedRows = [...importRows];
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < updatedRows.length; i++) {
      try {
        await AssetService.createAsset(updatedRows[i].data);
        updatedRows[i].status = 'success';
        successful++;
      } catch (error: any) {
        updatedRows[i].status = 'error';
        updatedRows[i].error = error.message || 'Unknown error';
        errors.push(`Row ${updatedRows[i].rowNumber}: ${updatedRows[i].error}`);
        failed++;
      }
      
      setImportRows([...updatedRows]);
      setImportProgress(((i + 1) / updatedRows.length) * 100);
    }

    setImportSummary({
      total: updatedRows.length,
      successful,
      failed,
      errors
    });

    setImporting(false);
    
    if (successful > 0) {
      toast.success(`Successfully imported ${successful} assets`);
      onSuccess();
    }
    
    if (failed > 0) {
      toast.error(`Failed to import ${failed} assets`);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setImportRows([]);
      setImportSummary(null);
      setValidationErrors([]);
      setImportProgress(0);
      onClose();
    }
  };

  const downloadTemplate = () => {
    // Build available options for reference
    const typeNames = assetTypes.map(t => t.name).join(', ') || 'No types available';
    const statusNames = assetStatuses.map(s => s.name).join(', ') || 'No statuses available';
    
    const csvContent = [
      '# ASSET IMPORT TEMPLATE',
      '# =====================',
      '#',
      '# REQUIRED FIELDS (marked with *):',
      '#   - label*: The name/label of the asset (e.g. "MacBook Pro 2023")',
      '#   - type_name*: Must match an existing asset type exactly',
      '#   - status_name*: Must match an existing asset status exactly',
      '#',
      '# OPTIONAL FIELDS:',
      '#   - location: Physical location of the asset',
      '#   - serial_number: Manufacturer serial number',
      '#   - purchase_date: Format YYYY-MM-DD (e.g. 2023-01-15)',
      '#   - warranty_expiry: Format YYYY-MM-DD (e.g. 2026-01-15)',
      '#   - notes: Additional notes about the asset',
      '#',
      '# NOTE: Asset Key is auto-generated. Assets will be added to the current group.',
      '#',
      `# AVAILABLE ASSET TYPES: ${typeNames}`,
      `# AVAILABLE STATUSES: ${statusNames}`,
      '#',
      '# Delete these comment lines before importing (or leave them - they will be ignored)',
      '#',
      'label*,type_name*,status_name*,location,serial_number,purchase_date,warranty_expiry,notes',
      'MacBook Pro 2023,Laptop,In Stock,Melbourne Office,C02ZX1234567,2023-01-15,2026-01-15,High-performance laptop for development',
      'Dell Monitor 27",Monitor,In Use,Sydney Office,DELL-789456123,2022-06-20,2025-06-20,4K UHD Display'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Assets from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import assets. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Need the import template?</p>
              <p className="text-sm text-muted-foreground">
                Download the CSV template with example data and column headers.
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select CSV File</label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                  disabled={importing}
                />
                <label htmlFor="csv-file-input" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {file ? file.name : 'Click to select CSV file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum file size: 10MB
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Validation Errors:</p>
                <ul className="text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Importing assets...</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(importProgress)}%
                </span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {/* Import Preview/Results */}
          {importRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {importSummary ? 'Import Results' : 'Import Preview'}
                </h4>
                {importSummary && (
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {importSummary.successful} Success
                    </Badge>
                    {importSummary.failed > 0 && (
                      <Badge variant="destructive">
                        {importSummary.failed} Failed
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <ScrollArea className="h-64 border rounded-md">
                <div className="p-4">
                  {importRows.map((row, index) => (
                    <div key={index} className="flex items-center gap-3 py-2">
                      <div className="flex-shrink-0">
                        {row.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {row.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {row.status === 'pending' && (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/25" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Row {row.rowNumber}: {row.data.label}
                        </p>
                        {row.error && (
                          <p className="text-xs text-red-600">{row.error}</p>
                        )}
                      </div>
                      
                      <Badge variant="outline" className="text-xs">
                        {row.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Import Summary */}
          {importSummary && importSummary.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Error Details:</h4>
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-1 text-xs">
                  {importSummary.errors.map((error, index) => (
                    <p key={index} className="text-red-600">• {error}</p>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {importSummary ? 'Close' : 'Cancel'}
          </Button>
          {!importSummary && (
            <Button 
              onClick={handleImport} 
              disabled={importRows.length === 0 || validationErrors.length > 0 || importing}
            >
              Import {importRows.length} Assets
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}