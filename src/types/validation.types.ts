/**
 * Validation Types
 * 
 * Shared validation interfaces used across timesheet components
 */

export interface BudgetValidation {
  isValid: boolean;
  message?: string;
  remainingHours: number;
  totalBudget: number;
  hoursUsed: number;
  isOverBudget: boolean;
  canOverride: boolean;
  usagePercentage: number;
  warningLevel: 'none' | 'approaching' | 'exceeded';
  severity?: 'error' | 'warning' | 'info';
  valid?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
}
