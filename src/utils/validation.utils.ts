/**
 * Validation Utilities
 *
 * Common validation functions to reduce duplication across
 * validation services.
 */

import { AppError, getErrorMessage } from '@/types/error.types';

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  errors?: string[];
}

/**
 * Budget validation result
 */
export interface BudgetValidationResult extends ValidationResult {
  budgetHours?: number;
  usedHours?: number;
  remainingHours?: number;
  percentageUsed?: number;
}

/**
 * Create a successful validation result
 */
export function validResult(message?: string): ValidationResult {
  return {
    isValid: true,
    message,
  };
}

/**
 * Create a failed validation result
 */
export function invalidResult(message: string, errors?: string[]): ValidationResult {
  return {
    isValid: false,
    message,
    errors,
  };
}

/**
 * Create a budget validation result
 */
export function budgetResult(
  isValid: boolean,
  budgetHours: number,
  usedHours: number,
  message?: string
): BudgetValidationResult {
  const remainingHours = budgetHours - usedHours;
  const percentageUsed = budgetHours > 0 ? (usedHours / budgetHours) * 100 : 0;

  return {
    isValid,
    message,
    budgetHours,
    usedHours,
    remainingHours,
    percentageUsed,
  };
}

/**
 * Validate that a value is not null or undefined
 */
export function isRequired<T>(value: T | null | undefined, fieldName: string): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return invalidResult(`${fieldName} is required`);
  }
  return validResult();
}

/**
 * Validate that a number is within a range
 */
export function isInRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (value < min || value > max) {
    return invalidResult(`${fieldName} must be between ${min} and ${max}`);
  }
  return validResult();
}

/**
 * Validate that a string matches a pattern
 */
export function matchesPattern(
  value: string,
  pattern: RegExp,
  fieldName: string,
  errorMessage?: string
): ValidationResult {
  if (!pattern.test(value)) {
    return invalidResult(errorMessage || `${fieldName} has an invalid format`);
  }
  return validResult();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): ValidationResult {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return matchesPattern(email, emailPattern, 'Email', 'Invalid email address');
}

/**
 * Validate that hours don't exceed budget
 */
export function validateBudgetExceeded(
  budgetHours: number,
  usedHours: number,
  newHours: number,
  projectName: string
): BudgetValidationResult {
  const totalHours = usedHours + newHours;

  if (totalHours > budgetHours) {
    const excessHours = totalHours - budgetHours;
    return budgetResult(
      false,
      budgetHours,
      totalHours,
      `This entry would exceed the budget for ${projectName} by ${excessHours.toFixed(2)} hours`
    );
  }

  return budgetResult(true, budgetHours, totalHours);
}

/**
 * Validate that hours are approaching budget threshold
 */
export function validateBudgetWarning(
  budgetHours: number,
  usedHours: number,
  newHours: number,
  warningThreshold: number = 0.8 // 80% threshold
): BudgetValidationResult {
  const totalHours = usedHours + newHours;
  const percentageUsed = budgetHours > 0 ? (totalHours / budgetHours) * 100 : 0;

  if (percentageUsed >= warningThreshold * 100 && percentageUsed < 100) {
    return budgetResult(
      true,
      budgetHours,
      totalHours,
      `Warning: This entry will use ${percentageUsed.toFixed(0)}% of the project budget`
    );
  }

  return budgetResult(true, budgetHours, totalHours);
}

/**
 * Validate that a date is not in the future
 */
export function isNotFutureDate(date: Date, fieldName: string = 'Date'): ValidationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate > today) {
    return invalidResult(`${fieldName} cannot be in the future`);
  }
  return validResult();
}

/**
 * Validate that a date is within a range
 */
export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date,
  fieldName: string = 'Date'
): ValidationResult {
  if (date < startDate || date > endDate) {
    return invalidResult(
      `${fieldName} must be between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`
    );
  }
  return validResult();
}

/**
 * Validate that hours are positive and reasonable
 */
export function isValidHours(hours: number): ValidationResult {
  if (hours <= 0) {
    return invalidResult('Hours must be greater than 0');
  }

  if (hours > 24) {
    return invalidResult('Hours cannot exceed 24 per day');
  }

  return validResult();
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const errors: string[] = [];

  for (const result of results) {
    if (!result.isValid) {
      if (result.message) {
        errors.push(result.message);
      }
      if (result.errors) {
        errors.push(...result.errors);
      }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      message: errors[0], // First error as main message
      errors,
    };
  }

  return validResult();
}

/**
 * Safe error handler for validation functions
 */
export function safeValidation<T extends ValidationResult>(
  validationFn: () => T,
  fallbackMessage: string = 'Validation error occurred'
): T {
  try {
    return validationFn();
  } catch (error) {
    console.error('Validation error:', error);
    return invalidResult(getErrorMessage(error) || fallbackMessage) as T;
  }
}

/**
 * Async validation wrapper
 */
export async function asyncValidation<T extends ValidationResult>(
  validationFn: () => Promise<T>,
  fallbackMessage: string = 'Validation error occurred'
): Promise<T> {
  try {
    return await validationFn();
  } catch (error) {
    console.error('Async validation error:', error);
    return invalidResult(getErrorMessage(error) || fallbackMessage) as T;
  }
}
