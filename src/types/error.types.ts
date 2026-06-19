/**
 * Standardized Error Types for the Application
 *
 * This file provides type-safe error handling patterns to replace
 * the use of 'any' in catch blocks throughout the codebase.
 */

import { PostgrestError } from '@supabase/supabase-js';

/**
 * Base error type for all application errors
 */
export interface BaseError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Supabase database error
 */
export type DatabaseError = PostgrestError;

/**
 * API/Network error
 */
export interface ApiError extends BaseError {
  statusCode?: number;
  response?: unknown;
}

/**
 * Validation error
 */
export interface ValidationError extends BaseError {
  field?: string;
  constraints?: Record<string, string>;
}

/**
 * Authentication error
 */
export interface AuthError extends BaseError {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'SESSION_EXPIRED' | 'INVALID_CREDENTIALS';
}

/**
 * File upload error
 */
export interface FileUploadError extends BaseError {
  fileName?: string;
  fileSize?: number;
  maxSize?: number;
}

/**
 * Generic error that can be any of the above types
 */
export type AppError =
  | Error
  | DatabaseError
  | ApiError
  | ValidationError
  | AuthError
  | FileUploadError
  | BaseError;

/**
 * Type guard to check if error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'field' in error &&
    'constraints' in error
  );
}

/**
 * Type guard to check if error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as AuthError).code === 'string' &&
    ['UNAUTHORIZED', 'FORBIDDEN', 'SESSION_EXPIRED', 'INVALID_CREDENTIALS'].includes(
      (error as AuthError).code
    )
  );
}

/**
 * Safely extract error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isDatabaseError(error)) {
    return error.message || 'Database error occurred';
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Create a standardized error object
 */
export function createError(message: string, code?: string, details?: unknown): BaseError {
  return {
    message,
    code,
    details,
  };
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<E = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}
