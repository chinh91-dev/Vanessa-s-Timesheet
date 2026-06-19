import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useCreateService } from "@/hooks/crm/useServices";
import { toast } from "@/hooks/use-toast";

interface ServiceImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedService {
  name: string;
  sku?: string;
  category?: string;
  billing_types?: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const TEMPLATE_HEADERS = ["name", "sku", "category", "billing_types"];
const VALID_BILLING_TYPES = ["monthly", "one_off", "t_and_m"];

export function ServiceImportDialog({ open, onClose }: ServiceImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedService[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createService = useCreateService();

  const handleDownloadTemplate = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(","),
      '"Cloud Hosting","SVC-001","Infrastructure","monthly,t_and_m"',
      '"One-time Setup","SVC-002","Professional Services","one_off"',
      '"Consulting Hours","SVC-003","Consulting","t_and_m,monthly"',
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "services_import_template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text: string): ParsedService[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const nameIndex = headers.indexOf("name");
    
    if (nameIndex === -1) {
      throw new Error("CSV must have a 'name' column");
    }

    const services: ParsedService[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const name = values[nameIndex]?.trim();
      
      if (!name) {
        errors.push(`Row ${i + 1}: Missing required 'name' field`);
        continue;
      }

      const skuIndex = headers.indexOf("sku");
      const catIndex = headers.indexOf("category");
      const billingIndex = headers.indexOf("billing_types");

      // Parse billing_types - comma-separated values
      let billingTypes: string[] = [];
      const billingValue = values[billingIndex]?.trim().toLowerCase();
      if (billingValue) {
        const types = billingValue.split(',').map(t => t.trim()).filter(Boolean);
        const invalidTypes = types.filter(t => !VALID_BILLING_TYPES.includes(t));
        if (invalidTypes.length > 0) {
          errors.push(`Row ${i + 1}: Invalid billing_types '${invalidTypes.join(", ")}'. Must be: ${VALID_BILLING_TYPES.join(", ")}`);
          continue;
        }
        billingTypes = types;
      }

      services.push({
        name,
        sku: skuIndex >= 0 ? values[skuIndex]?.trim() : undefined,
        category: catIndex >= 0 ? values[catIndex]?.trim() : undefined,
        billing_types: billingTypes.length > 0 ? billingTypes : undefined,
      });
    }

    setParseErrors(errors);
    return services;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);
    setParseErrors([]);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV",
        variant: "destructive",
      });
      setParsedData([]);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsImporting(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const service of parsedData) {
      try {
        await createService.mutateAsync({
          name: service.name,
          sku: service.sku || undefined,
          category: service.category || undefined,
          billing_types: service.billing_types,
          is_active: true,
        });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to import "${service.name}": ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    setImportResult(result);
    setIsImporting(false);

    if (result.success > 0) {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} service${result.success !== 1 ? "s" : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
      });
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    setParseErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Services</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import services. Download the template for the correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">CSV Template</p>
                <p className="text-sm text-muted-foreground">Download to see required format</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full h-20 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span>{file ? file.name : "Click to upload CSV file"}</span>
              </div>
            </Button>
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Parse warnings:</p>
                <ul className="list-disc pl-4 text-sm">
                  {parseErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>...and {parseErrors.length - 5} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && !importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Found <strong>{parsedData.length}</strong> service{parsedData.length !== 1 ? "s" : ""} ready to import.
              </AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
              {importResult.failed > 0 ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                <p>
                  Imported: <strong>{importResult.success}</strong>
                  {importResult.failed > 0 && (
                    <>, Failed: <strong>{importResult.failed}</strong></>
                  )}
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="list-disc pl-4 text-sm mt-2">
                    {importResult.errors.slice(0, 3).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={parsedData.length === 0 || isImporting}
              >
                {isImporting ? "Importing..." : `Import ${parsedData.length} Service${parsedData.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
