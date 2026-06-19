/**
 * Form Type Definitions
 *
 * Standardized types for form handling, dialog management,
 * and form state across the application.
 */

import { VoidCallback } from './common.types';

/**
 * Dialog mode types
 */
export type DialogMode = 'create' | 'edit' | 'view' | 'delete';

/**
 * Standard dialog props
 */
export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog props with mode
 */
export interface DialogProps extends BaseDialogProps {
  mode?: DialogMode;
}

/**
 * Form dialog props
 */
export interface FormDialogProps<T> extends BaseDialogProps {
  /**
   * Entity being edited (undefined for create mode)
   */
  entity?: T;
  /**
   * Callback when form is successfully submitted
   */
  onSuccess?: VoidCallback;
  /**
   * Callback when form submission fails
   */
  onError?: (error: Error) => void;
}

/**
 * Confirm dialog props
 */
export interface ConfirmDialogProps extends BaseDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: VoidCallback | (() => Promise<void>);
}

/**
 * Delete confirmation dialog props
 */
export interface DeleteDialogProps<T> extends BaseDialogProps {
  entity: T;
  entityName: string;
  onConfirm: (entity: T) => Promise<void>;
}

/**
 * Form submission state
 */
export interface FormSubmissionState {
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
}

/**
 * Form field error
 */
export interface FormFieldError {
  field: string;
  message: string;
  type?: string;
}

/**
 * Form field config
 */
export interface FormFieldConfig<T = string> {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: T }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: T) => string | undefined;
  };
}

/**
 * Combobox/Select props
 */
export interface ComboboxProps<T> {
  value: T | null;
  onValueChange: (value: T | null) => void;
  options: Array<{
    label: string;
    value: T;
    disabled?: boolean;
    description?: string;
  }>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  className?: string;
}

/**
 * Multi-select combobox props
 */
export interface MultiComboboxProps<T> extends Omit<ComboboxProps<T>, 'value' | 'onValueChange'> {
  value: T[];
  onValueChange: (value: T[]) => void;
}

/**
 * Date picker props
 */
export interface DatePickerProps {
  value: Date | null;
  onValueChange: (value: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

/**
 * File upload props
 */
export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  description?: string;
  preview?: boolean;
  className?: string;
}

/**
 * Filter panel props
 */
export interface FilterPanelProps<T> {
  filters: T;
  onFiltersChange: (filters: T) => void;
  onReset?: VoidCallback;
  className?: string;
}

/**
 * Search input props
 */
export interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

/**
 * Pagination props
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

/**
 * Data table column definition
 */
export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => unknown);
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Data table props
 */
export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: PaginationProps;
  className?: string;
}

/**
 * Action button config
 */
export interface ActionButton {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: VoidCallback;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Bulk action config
 */
export interface BulkAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onExecute: (items: T[]) => Promise<void>;
  variant?: 'default' | 'destructive';
  confirmMessage?: string;
}

/**
 * Form section props
 */
export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}
