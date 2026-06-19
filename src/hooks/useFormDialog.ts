/**
 * useFormDialog Hook
 *
 * Reusable hook for managing dialog and form state.
 * Eliminates the pattern of:
 *   const [open, setOpen] = useState(false);
 *   const [isSubmitting, setIsSubmitting] = useState(false);
 *   const [error, setError] = useState<string | null>(null);
 */

import { useState, useCallback } from 'react';
import { AppError, getErrorMessage } from '@/types/error.types';
import { DialogMode } from '@/types/form.types';

export interface FormDialogState<T> {
  isOpen: boolean;
  mode: DialogMode;
  entity: T | null;
  isSubmitting: boolean;
  error: string | null;
}

export interface FormDialogActions<T> {
  open: (mode?: DialogMode) => void;
  openCreate: () => void;
  openEdit: (entity: T) => void;
  openView: (entity: T) => void;
  openDelete: (entity: T) => void;
  close: () => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  handleError: (error: unknown) => void;
  reset: () => void;
}

export interface UseFormDialogReturn<T> extends FormDialogState<T>, FormDialogActions<T> {
  /**
   * Submit handler wrapper that manages submission state
   */
  handleSubmit: (submitFn: () => Promise<void>) => Promise<void>;
}

/**
 * Hook for managing form dialog state
 */
export function useFormDialog<T = unknown>(initialMode: DialogMode = 'create'): UseFormDialogReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>(initialMode);
  const [entity, setEntity] = useState<T | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((dialogMode: DialogMode = 'create') => {
    setMode(dialogMode);
    setIsOpen(true);
    setError(null);
  }, []);

  const openCreate = useCallback(() => {
    setEntity(null);
    open('create');
  }, [open]);

  const openEdit = useCallback(
    (editEntity: T) => {
      setEntity(editEntity);
      open('edit');
    },
    [open]
  );

  const openView = useCallback(
    (viewEntity: T) => {
      setEntity(viewEntity);
      open('view');
    },
    [open]
  );

  const openDelete = useCallback(
    (deleteEntity: T) => {
      setEntity(deleteEntity);
      open('delete');
    },
    [open]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    // Don't reset entity/mode immediately to allow for closing animations
    setTimeout(() => {
      setEntity(null);
      setMode(initialMode);
    }, 300);
  }, [initialMode]);

  const handleError = useCallback((err: unknown) => {
    const message = getErrorMessage(err);
    setError(message);
    console.error('Form dialog error:', err);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setMode(initialMode);
    setEntity(null);
    setIsSubmitting(false);
    setError(null);
  }, [initialMode]);

  const handleSubmit = useCallback(
    async (submitFn: () => Promise<void>) => {
      try {
        setIsSubmitting(true);
        setError(null);
        await submitFn();
        close();
      } catch (err) {
        handleError(err);
        throw err; // Re-throw to allow caller to handle if needed
      } finally {
        setIsSubmitting(false);
      }
    },
    [close, handleError]
  );

  return {
    // State
    isOpen,
    mode,
    entity,
    isSubmitting,
    error,

    // Actions
    open,
    openCreate,
    openEdit,
    openView,
    openDelete,
    close,
    setSubmitting: setIsSubmitting,
    setError,
    handleError,
    reset,
    handleSubmit,
  };
}
