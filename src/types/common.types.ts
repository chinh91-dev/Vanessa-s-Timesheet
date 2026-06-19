/**
 * Common Type Definitions
 *
 * Shared types used across the application to replace 'any' and
 * provide better type safety.
 */

/**
 * Generic ID type (UUID string)
 */
export type ID = string;

/**
 * ISO 8601 date string (YYYY-MM-DD)
 */
export type DateString = string;

/**
 * ISO 8601 datetime string
 */
export type DateTimeString = string;

/**
 * Email address string
 */
export type Email = string;

/**
 * Phone number string
 */
export type Phone = string;

/**
 * URL string
 */
export type URL = string;

/**
 * User role types
 */
export type UserRole = 'admin' | 'employee';

/**
 * Employment type
 */
export type EmploymentType = 'full-time' | 'part-time' | 'casual' | 'contractor' | 'fixed-term';

/**
 * Work location types
 */
export type WorkLocation = 'office' | 'home' | 'client' | 'jolimont' | 'collins_square';

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Approval status
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * Generic status
 */
export type Status = 'active' | 'inactive' | 'archived' | 'deleted';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  direction: SortDirection;
}

/**
 * Filter operator types
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'in'
  | 'is'
  | 'not';

/**
 * Generic filter
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Query parameters for list operations
 */
export interface QueryParams {
  pagination?: PaginationParams;
  sort?: SortParams;
  filters?: Filter[];
  search?: string;
}

/**
 * Select option type for dropdowns/comboboxes
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  description?: string;
}

/**
 * Key-value pair
 */
export interface KeyValue<K = string, V = unknown> {
  key: K;
  value: V;
}

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

/**
 * Optional type helper
 */
export type Optional<T> = T | undefined;

/**
 * Make specific fields optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific fields required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Audit fields common to many tables
 */
export interface AuditFields {
  created_at: DateTimeString;
  updated_at: DateTimeString;
  created_by?: ID;
  updated_by?: ID;
}

/**
 * Base entity with ID and audit fields
 */
export interface BaseEntity extends AuditFields {
  id: ID;
}

/**
 * Soft delete fields
 */
export interface SoftDeleteFields {
  deleted_at?: DateTimeString | null;
  deleted_by?: ID | null;
}

/**
 * Entity with soft delete capability
 */
export interface SoftDeletableEntity extends BaseEntity, SoftDeleteFields {}

/**
 * Loading state type
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Async data state
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Form field error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Form state
 */
export interface FormState<T> {
  values: T;
  errors: FieldError[];
  touched: Set<keyof T>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Dialog state helper
 */
export interface DialogState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
}

/**
 * File upload state
 */
export interface FileUploadState {
  file: File | null;
  preview?: string;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  dateRange?: {
    start: DateString;
    end: DateString;
  };
}

/**
 * Callback function types
 */
export type VoidCallback = () => void;
export type AsyncVoidCallback = () => Promise<void>;
export type Callback<T> = (value: T) => void;
export type AsyncCallback<T> = (value: T) => Promise<void>;

/**
 * Component props with children
 */
export interface PropsWithChildren {
  children?: React.ReactNode;
}

/**
 * Component props with className
 */
export interface PropsWithClassName {
  className?: string;
}

/**
 * Standard component props
 */
export interface StandardProps extends PropsWithChildren, PropsWithClassName {}
