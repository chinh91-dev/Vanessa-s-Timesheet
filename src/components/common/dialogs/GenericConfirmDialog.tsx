/**
 * GenericConfirmDialog Component
 *
 * Confirmation dialog for destructive or important actions.
 * Includes delete confirmations, approvals, etc.
 */

import React from 'react';
import { GenericDialog, StandardDialogFooter } from './GenericDialog';
import { ConfirmDialogProps, DeleteDialogProps } from '@/types';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Generic confirmation dialog
 */
export function GenericConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      setError(null);
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <GenericDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      maxWidth="max-w-md"
      loading={isConfirming}
      error={error}
      preventClose={isConfirming}
      footer={
        <StandardDialogFooter
          onCancel={handleCancel}
          onSubmit={handleConfirm}
          submitLabel={confirmText}
          cancelLabel={cancelText}
          submitLoading={isConfirming}
          submitVariant={variant}
        />
      }
    >
      {variant === 'destructive' && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-md border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">This action cannot be undone.</p>
        </div>
      )}
    </GenericDialog>
  );
}

/**
 * Delete confirmation dialog with entity name
 */
export function GenericDeleteDialog<T extends { id?: string; name?: string }>({
  open,
  onOpenChange,
  entity,
  entityName,
  onConfirm,
}: DeleteDialogProps<T>) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm(entity);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onOpenChange(false);
  };

  const displayName = entity.name || entityName;

  return (
    <GenericDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${entityName}`}
      description={`Are you sure you want to delete "${displayName}"?`}
      maxWidth="max-w-md"
      loading={isDeleting}
      error={error}
      preventClose={isDeleting}
      footer={
        <StandardDialogFooter
          onCancel={handleCancel}
          onSubmit={handleConfirm}
          submitLabel="Delete"
          cancelLabel="Cancel"
          submitLoading={isDeleting}
          submitVariant="destructive"
        />
      }
    >
      <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-md border border-destructive/20">
        <Trash2 className="h-5 w-5 text-destructive flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-destructive">This action cannot be undone.</p>
          <p className="text-sm text-muted-foreground mt-1">
            All associated data will be permanently removed.
          </p>
        </div>
      </div>
    </GenericDialog>
  );
}
