/**
 * GenericDialog Component
 *
 * Base dialog wrapper that provides consistent styling and behavior.
 * Used as foundation for all specialized dialogs.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BaseDialogProps } from '@/types';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface GenericDialogProps extends BaseDialogProps {
  /**
   * Dialog title
   */
  title: string;

  /**
   * Optional description below title
   */
  description?: string;

  /**
   * Dialog content
   */
  children: React.ReactNode;

  /**
   * Footer buttons/actions
   */
  footer?: React.ReactNode;

  /**
   * Show loading state
   */
  loading?: boolean;

  /**
   * Error message to display
   */
  error?: string | null;

  /**
   * Max width class (default: max-w-md)
   */
  maxWidth?: 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl';

  /**
   * Additional className for DialogContent
   */
  className?: string;

  /**
   * Prevent closing on outside click or escape
   */
  preventClose?: boolean;
}

/**
 * Generic reusable dialog component
 */
export function GenericDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  loading = false,
  error,
  maxWidth = 'max-w-md',
  className = '',
  preventClose = false,
}: GenericDialogProps) {
  const handleOpenChange = (isOpen: boolean) => {
    // Prevent closing if preventClose is true and user is trying to close
    if (!isOpen && preventClose) {
      return;
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${maxWidth} ${className}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Standard footer with Cancel and Submit buttons
 */
export interface StandardFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function StandardDialogFooter({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitDisabled = false,
  submitLoading = false,
  submitVariant = 'default',
}: StandardFooterProps) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onCancel} disabled={submitLoading}>
        {cancelLabel}
      </Button>
      <Button type="submit" variant={submitVariant} onClick={onSubmit} disabled={submitDisabled || submitLoading}>
        {submitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </>
  );
}
