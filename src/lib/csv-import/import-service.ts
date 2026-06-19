
import { parseCSV } from "@/lib/csv-parser";
import { fetchCustomers } from "@/lib/customer-service";
import { ValidationError } from "@/lib/csv-validation";
import { processRow } from "./processors";
import { getRowIdentifier } from "./utils";
import { EntityType, REQUIRED_HEADERS, VALIDATORS, BATCH_SIZE } from "./config";

export interface ImportResult {
  success: number;
  errors: number;
  validationErrors: ValidationError[];
  processingErrors: string[];
}

export interface ImportProgress {
  processed: number;
  total: number;
  current: string;
}

export const importCSV = async (
  file: File,
  entityType: EntityType,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  const csvText = await file.text();
  const parsed = parseCSV(csvText);
  
  if (parsed.errors.length > 0) {
    return {
      success: 0,
      errors: parsed.errors.length,
      validationErrors: [],
      processingErrors: parsed.errors
    };
  }

  // Validate required headers
  const requiredHeaders = REQUIRED_HEADERS[entityType];
  const missingHeaders = requiredHeaders.filter(header => !parsed.headers.includes(header));
  
  if (missingHeaders.length > 0) {
    return {
      success: 0,
      errors: 1,
      validationErrors: [],
      processingErrors: [`Missing required headers: ${missingHeaders.join(', ')}`]
    };
  }

  // Validate all rows first
  const validationErrors: ValidationError[] = [];
  const validator = VALIDATORS[entityType];
  
  parsed.data.forEach((row, index) => {
    const rowErrors = validator(row, index + 2); // +2 because of 0-index and header row
    validationErrors.push(...rowErrors);
  });

  if (validationErrors.length > 0) {
    return {
      success: 0,
      errors: validationErrors.length,
      validationErrors,
      processingErrors: []
    };
  }

  // Get existing customers if needed for reference resolution
  let existingCustomers: any[] = [];
  if (entityType === 'projects' || entityType === 'contracts') {
    existingCustomers = await fetchCustomers();
  }

  // Process rows in batches
  let successCount = 0;
  const processingErrors: string[] = [];
  
  for (let i = 0; i < parsed.data.length; i += BATCH_SIZE) {
    const batch = parsed.data.slice(i, i + BATCH_SIZE);
    
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const rowIndex = i + j + 1;
      
      onProgress?.({
        processed: i + j,
        total: parsed.data.length,
        current: getRowIdentifier(row, entityType)
      });
      
      try {
        await processRow(row, entityType, existingCustomers, rowIndex);
        successCount++;
      } catch (error) {
        processingErrors.push(`Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  return {
    success: successCount,
    errors: processingErrors.length,
    validationErrors: [],
    processingErrors
  };
};
