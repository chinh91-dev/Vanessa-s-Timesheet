import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Upload, Download, FileText, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { importCSV, EntityType, ImportResult, ImportProgress } from "@/lib/csv-import-service";
import { generateCSVTemplate, parseCSV } from "@/lib/csv-parser";
import ContactImportPreview, { ContactPreviewRow } from "@/components/crm/contacts/ContactImportPreview";
import { importContactsFromPreview } from "@/lib/csv-import/contact-import";

interface CSVImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'preview' | 'result';

const CSVImportDialog: React.FC<CSVImportDialogProps> = ({
  isOpen,
  onClose,
  entityType,
  onImportComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [previewData, setPreviewData] = useState<ContactPreviewRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entityLabels = {
    projects: 'Projects',
    customers: 'Customers',
    contracts: 'Contracts',
    'team-members': 'Team Members',
    contacts: 'Contacts'
  };

  const normalizeContactFieldName = (fieldName: string): string => {
    const normalized = fieldName.toLowerCase().trim();
    if (normalized.startsWith('source')) return 'source';
    if (normalized.includes('contact') && normalized.includes('name')) return 'contact_name';
    if (normalized === 'name') return 'contact_name';
    if (normalized.includes('company')) return 'company_name';
    if (normalized.includes('work') && normalized.includes('phone')) return 'work_phone';
    if (normalized.includes('mobile')) return 'mobile_phone';
    if (normalized.includes('phone')) return 'work_phone'; // Default phone to work_phone
    return normalized.replace(/\s+/g, '_');
  };

  const parseContactsForPreview = async (file: File): Promise<ContactPreviewRow[]> => {
    const csvText = await file.text();
    const parsed = parseCSV(csvText);
    
    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]);
    }

    return parsed.data.map((row: any) => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        normalizedRow[normalizeContactFieldName(key)] = row[key];
      });
      
      return {
        contact_name: normalizedRow.contact_name?.toString().trim() || '',
        company_name: normalizedRow.company_name?.toString().trim() || '',
        email: normalizedRow.email?.toString().trim() || '',
        work_phone: normalizedRow.work_phone?.toString().trim() || '',
        mobile_phone: normalizedRow.mobile_phone?.toString().trim() || '',
        title: normalizedRow.title?.toString().trim() || '',
        source: normalizedRow.source?.toString().trim().toLowerCase() || '',
        status: normalizedRow.status?.toString().trim().toLowerCase() || 'new',
        notes: normalizedRow.notes?.toString().trim() || '',
      };
    });
  };

  const handleFileSelect = async (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setResult(null);

    // For contacts, parse and show preview
    if (entityType === 'contacts') {
      try {
        const data = await parseContactsForPreview(file);
        if (data.length === 0) {
          toast({
            title: "No data found",
            description: "The CSV file appears to be empty",
            variant: "destructive",
          });
          return;
        }
        setPreviewData(data);
        setStep('preview');
      } catch (error) {
        toast({
          title: "Failed to parse CSV",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setProgress(null);
    setResult(null);

    try {
      const importResult = await importCSV(selectedFile, entityType, setProgress);
      setResult(importResult);
      
      if (importResult.success > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${importResult.success} ${entityLabels[entityType].toLowerCase()}`,
        });
        onImportComplete();
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const handleContactImport = async () => {
    setImporting(true);
    setProgress(null);
    setResult(null);

    try {
      const importResult = await importContactsFromPreview(previewData, setProgress);
      setResult(importResult);
      setStep('result');
      
      if (importResult.success > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${importResult.success} contacts`,
        });
        onImportComplete();
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(entityType);
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    setProgress(null);
    setImporting(false);
    setStep('upload');
    setPreviewData([]);
    onClose();
  };

  const handleBackToUpload = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'preview' ? 'Review Contact Import' : `Import ${entityLabels[entityType]}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'preview' 
              ? 'Select the correct source and status for each contact before importing'
              : `Upload a CSV file to import multiple ${entityLabels[entityType].toLowerCase()} at once`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'upload' && (
            <>
              {/* Template Download */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Download Template</p>
                    <p className="text-sm text-muted-foreground">
                      Get the correct CSV format with example data
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              {/* File Upload */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                
                {selectedFile && entityType !== 'contacts' ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <p className="font-medium">Drop your CSV file here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'preview' && entityType === 'contacts' && (
            <ContactImportPreview 
              data={previewData} 
              onDataChange={setPreviewData} 
            />
          )}

          {/* Progress */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing: {progress.current}</span>
                <span>{progress.processed + 1} of {progress.total}</span>
              </div>
              <Progress value={(progress.processed / progress.total) * 100} />
            </div>
          )}

          {/* Results */}
          {(result || step === 'result') && result && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Badge variant="default" className="bg-green-500">
                  {result.success} Successful
                </Badge>
                {result.errors > 0 && (
                  <Badge variant="destructive">
                    {result.errors} Errors
                  </Badge>
                )}
              </div>

              {result.validationErrors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Validation Errors:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {result.validationErrors.slice(0, 10).map((error, index) => (
                          <p key={index} className="text-sm">
                            Row {error.row}, {error.field}: {error.message}
                          </p>
                        ))}
                        {result.validationErrors.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {result.validationErrors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {result.processingErrors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Processing Errors:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {result.processingErrors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-sm">{error}</p>
                        ))}
                        {result.processingErrors.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {result.processingErrors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            {step === 'preview' && (
              <Button variant="outline" onClick={handleBackToUpload}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {step === 'upload' && selectedFile && entityType !== 'contacts' && !result && (
              <Button 
                onClick={handleImport} 
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            )}
            {step === 'preview' && entityType === 'contacts' && (
              <Button 
                onClick={handleContactImport} 
                disabled={importing}
              >
                {importing ? 'Importing...' : `Import ${previewData.length} Contacts`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
