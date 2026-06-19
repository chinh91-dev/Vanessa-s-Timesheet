/**
 * Service Error Handler Utility
 *
 * Provides consistent error handling patterns across all service layer functions.
 * Replaces the inconsistent `catch (error)` and `catch (error: any)` patterns
 * throughout the codebase with type-safe error handling.
 */

import { getErrorMessage, AppError, Result, success, failure } from '@/types/error.types';

/**
 * Configuration for error handling
 */
export interface ErrorHandlerConfig {
  /** Context for logging (e.g., "validateProjectBudget", "fetchUserData") */
  context: string;

  /** Whether to log errors to console (default: true) */
  logErrors?: boolean;

  /** Custom error message to return to user */
  userMessage?: string;

  /** Fallback value to return on error (for non-Result returns) */
  fallbackValue?: unknown;
}

/**
 * Wraps an async operation with standardized error handling
 *
 * @example
 * ```typescript
 * const result = await handleServiceError(
 *   async () => {
 *     const data = await supabase.from('users').select();
 *     return data;
 *   },
 *   { context: 'fetchUsers' }
 * );
 *
 * if (!result.success) {
 *   // Handle error
 *   console.error(result.error);
 * }
 * ```
 */
export async function handleServiceError<T>(
  operation: () => Promise<T>,
  config: ErrorHandlerConfig
): Promise<Result<T, AppError>> {
  const { context, logErrors = true, userMessage } = config;

  try {
    const data = await operation();
    return success(data);
  } catch (error: unknown) {
    if (logErrors) {
      console.error(`Error in ${context}:`, error);
    }

    const errorMessage = userMessage || getErrorMessage(error);
    const appError: AppError = error instanceof Error
      ? error
      : new Error(errorMessage);

    return failure(appError);
  }
}

/**
 * Wraps a sync operation with standardized error handling
 */
export function handleSyncServiceError<T>(
  operation: () => T,
  config: ErrorHandlerConfig
): Result<T, AppError> {
  const { context, logErrors = true, userMessage } = config;

  try {
    const data = operation();
    return success(data);
  } catch (error: unknown) {
    if (logErrors) {
      console.error(`Error in ${context}:`, error);
    }

    const errorMessage = userMessage || getErrorMessage(error);
    const appError: AppError = error instanceof Error
      ? error
      : new Error(errorMessage);

    return failure(appError);
  }
}

/**
 * Wraps an async operation with try-catch and returns fallback value on error
 * (For legacy code that doesn't use Result<T> pattern)
 *
 * @example
 * ```typescript
 * const hours = await tryServiceOperation(
 *   async () => await getProjectHours(projectId),
 *   { context: 'getProjectHours', fallbackValue: 0 }
 * );
 * ```
 */
export async function tryServiceOperation<T>(
  operation: () => Promise<T>,
  config: ErrorHandlerConfig & { fallbackValue: T }
): Promise<T> {
  const { context, logErrors = true, fallbackValue } = config;

  try {
    return await operation();
  } catch (error: unknown) {
    if (logErrors) {
      console.error(`Error in ${context}:`, error);
    }
    return fallbackValue;
  }
}

/**
 * Sync version of tryServiceOperation
 */
export function trySyncOperation<T>(
  operation: () => T,
  config: ErrorHandlerConfig & { fallbackValue: T }
): T {
  const { context, logErrors = true, fallbackValue } = config;

  try {
    return operation();
  } catch (error: unknown) {
    if (logErrors) {
      console.error(`Error in ${context}:`, error);
    }
    return fallbackValue;
  }
}

/**
 * Logs an error with consistent formatting
 */
export function logServiceError(context: string, error: unknown, additionalInfo?: Record<string, unknown>): void {
  console.error(`=== ERROR in ${context} ===`);
  console.error('Error:', error);

  if (additionalInfo) {
    console.error('Additional Info:', additionalInfo);
  }

  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Validates required parameters and throws a descriptive error if missing
 *
 * @example
 * ```typescript
 * validateRequiredParams({ userId, projectId }, 'validateProjectBudget');
 * ```
 */
export function validateRequiredParams(
  params: Record<string, unknown>,
  context: string
): void {
  const missingParams = Object.entries(params)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key);

  if (missingParams.length > 0) {
    throw new Error(
      `Missing required parameters in ${context}: ${missingParams.join(', ')}`
    );
  }
}

/**
 * Creates a standardized validation result
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Wraps validation logic with error handling
 */
export async function handleValidation(
  validator: () => Promise<ValidationResult>,
  config: ErrorHandlerConfig
): Promise<ValidationResult> {
  const { context, logErrors = true } = config;

  try {
    return await validator();
  } catch (error: unknown) {
    if (logErrors) {
      console.error(`Error in ${context}:`, error);
    }

    return {
      isValid: false,
      message: `Validation error: ${getErrorMessage(error)}`
    };
  }
}

/**
 * Sync version of handleValidation
 */
export function handleSyncValidation(
  validator: () => ValidationResult,
  config: ErrorHandlerConfig
): ValidationResult {
  const { context, logErrors = true } = config;

  try {
    return validator();
  } catch (error: unknown) {
    if (logErrors) {
      console.error(`Error in ${context}:`, error);
    }

    return {
      isValid: false,
      message: `Validation error: ${getErrorMessage(error)}`
    };
  }
}
