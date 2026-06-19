import { TimesheetEntry } from "../types";
import { supabase } from "@/integrations/supabase/client";

interface BatchValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validationDetails: {
    dateValid: boolean;
    budgetValid: boolean;
    weekendValid: boolean;
    holidayValid: boolean;
  };
}

interface ValidationCache {
  [key: string]: {
    result: BatchValidationResult;
    timestamp: number;
  };
}

const validationCache: ValidationCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Generate cache key for validation
const getValidationCacheKey = (entry: TimesheetEntry, userId: string): string => {
  return `${userId}:${entry.entry_date}:${entry.project_id}:${entry.contract_id}:${entry.hours_logged}:${entry.id}`;
};

// Check if cached validation is still valid
const getCachedValidation = (key: string): BatchValidationResult | null => {
  const cached = validationCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("Using cached validation result for:", key);
    return cached.result;
  }
  if (cached) {
    delete validationCache[key];
  }
  return null;
};

// Cache validation result
const setCachedValidation = (key: string, result: BatchValidationResult): void => {
  validationCache[key] = {
    result,
    timestamp: Date.now()
  };
};

// Batch validation function that performs all checks in parallel
export const validateEntryBatch = async (
  entry: TimesheetEntry,
  userId: string
): Promise<BatchValidationResult> => {
  const cacheKey = getValidationCacheKey(entry, userId);
  
  // Check cache first
  const cached = getCachedValidation(cacheKey);
  if (cached) {
    return cached;
  }

  console.log("=== PERFORMING BATCH VALIDATION ===");
  console.log("Entry:", entry);
  console.log("User ID:", userId);

  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const validationDetails = {
    dateValid: true,
    budgetValid: true,
    weekendValid: true,
    holidayValid: true,
  };

  try {
    // Call the batch validation RPC function
    const { data, error } = await supabase.rpc('validate_timesheet_entry_batch', {
      p_entry_data: {
        entry_date: entry.entry_date,
        project_id: entry.project_id,
        contract_id: entry.contract_id,
        hours_logged: entry.hours_logged,
        entry_type: entry.entry_type,
        existing_entry_id: entry.id
      },
      p_user_id: userId
    });

    if (error) {
      console.error("Batch validation RPC error:", error);
      errors.push("Validation service error");
      validationDetails.dateValid = false;
    } else if (data) {
      // Process validation results
      if (!data.date_valid) {
        errors.push(data.date_message || "Entry date is not allowed");
        validationDetails.dateValid = false;
      }

      if (!data.weekend_valid) {
        errors.push(data.weekend_message || "Weekend entries not allowed");
        validationDetails.weekendValid = false;
      }

      if (!data.holiday_valid) {
        errors.push(data.holiday_message || "Holiday entries not allowed");
        validationDetails.holidayValid = false;
      }

      if (!data.budget_valid) {
        if (data.budget_can_override) {
          warnings.push(data.budget_message || "Budget exceeded but can be overridden");
        } else {
          errors.push(data.budget_message || "Budget exceeded");
          validationDetails.budgetValid = false;
        }
      }
    }

    const result: BatchValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      validationDetails,
    };

    // Cache the result
    setCachedValidation(cacheKey, result);

    const duration = Date.now() - startTime;
    console.log(`Batch validation completed in ${duration}ms`);

    return result;

  } catch (error) {
    console.error("Batch validation error:", error);
    
    const result: BatchValidationResult = {
      isValid: false,
      errors: ["Validation failed: " + (error.message || "Unknown error")],
      warnings: [],
      validationDetails: {
        dateValid: false,
        budgetValid: false,
        weekendValid: false,
        holidayValid: false,
      },
    };

    return result;
  }
};

// Legacy compatibility functions
export const validateEntryData = async (entry: TimesheetEntry, userId: string): Promise<void> => {
  const result = await validateEntryBatch(entry, userId);
  
  if (!result.isValid) {
    throw new Error(result.errors[0] || "Validation failed");
  }
};

export const validateProjectBudgetForEntry = async (
  entry: TimesheetEntry,
  userId?: string
): Promise<void> => {
  if (!userId || entry.entry_type !== 'project' || !entry.project_id || !entry.hours_logged) {
    return;
  }

  const result = await validateEntryBatch(entry, userId);
  
  if (!result.validationDetails.budgetValid && result.errors.some(e => e.includes("Budget"))) {
    throw new Error(result.errors.find(e => e.includes("Budget")) || "Budget validation failed");
  }
};

// Clear validation cache
export const clearValidationCache = (): void => {
  Object.keys(validationCache).forEach(key => {
    delete validationCache[key];
  });
  console.log("Validation cache cleared");
};

// Cleanup old cache entries
export const cleanupValidationCache = (): void => {
  const now = Date.now();
  Object.keys(validationCache).forEach(key => {
    if (now - validationCache[key].timestamp > CACHE_TTL) {
      delete validationCache[key];
    }
  });
};

// Auto cleanup every 2 minutes
setInterval(cleanupValidationCache, 2 * 60 * 1000);