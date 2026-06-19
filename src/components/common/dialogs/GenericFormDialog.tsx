/**
 * GenericFormDialog Component
 *
 * Dialog wrapper for forms with automatic form state management.
 * Handles create/edit modes and validation.
 */

import React from 'react';
import { GenericDialog, StandardDialogFooter } from './GenericDialog';
import { FormDialogProps } from '@/types';

export interface GenericFormDialogProps<T> extends FormDialogProps<T> {
  /**
   * Dialog title (can be dynamic based on mode)
   */
  title: string | ((entity?: T) => string);

  /**
   * Optional description
   */
  description?: string;

  /**
   * Form content - receives entity and form handlers
   */
  children: (props: FormChildrenProps<T>) => React.ReactNode;

  /**
   * Submit handler
   */
  onSubmit: (data: T) => Promise<void>;

  /**
   * Custom submit button label
   */
  submitLabel?: string | ((entity?: T) => string);

  /**
   * Custom cancel button label
   */
  cancelLabel?: string;

  /**
   * Submit button variant
   */
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

  /**
   * Max width
   */
  maxWidth?: 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl';

  /**
   * Additional className
   */
  className?: string;

  /**
   * Disable submit button
   */
  submitDisabled?: boolean;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Error message
   */
  error?: string | null;
}

export interface FormChildrenProps<T> {
  entity?: T;
  isCreate: boolean;
  isEdit: boolean;
}

/**
 * Generic form dialog component
 */
export function GenericFormDialog<T>({
  open,
  onOpenChange,
  entity,
  title,
  description,
  children,
  onSubmit,
  onSuccess,
  onError,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitVariant = 'default',
  maxWidth = 'max-w-md',
  className,
  submitDisabled = false,
  loading = false,
  error,
}: GenericFormDialogProps<T>) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const isCreate = !entity;
  const isEdit = !!entity;

  // Resolve dynamic title
  const resolvedTitle = typeof title === 'function' ? title(entity) : title;

  // Resolve dynamic submit label
  const resolvedSubmitLabel = typeof submitLabel === 'function' ? submitLabel(entity) : submitLabel;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Trigger form submission
      const form = e?.target as HTMLFormElement;
      if (form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries()) as unknown as T;
        await onSubmit(data);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setSubmitError(message);
      onError?.(err as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSubmitError(null);
    onOpenChange(false);
  };

  const displayError = error || submitError;

  return (
    <GenericDialog
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTitle}
      description={description}
      maxWidth={maxWidth}
      className={className}
      loading={loading || isSubmitting}
      error={displayError}
      preventClose={isSubmitting}
      footer={
        <StandardDialogFooter
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          submitLabel={resolvedSubmitLabel}
          cancelLabel={cancelLabel}
          submitDisabled={submitDisabled}
          submitLoading={isSubmitting}
          submitVariant={submitVariant}
        />
      }
    >
      <form onSubmit={handleSubmit}>
        {children({ entity, isCreate, isEdit })}
      </form>
    </GenericDialog>
  );
}
