/**
 * AsyncCombobox Component
 *
 * Combobox that loads options asynchronously with React Query.
 * Useful for loading projects, contracts, users, etc.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GenericCombobox, FormCombobox } from './GenericCombobox';
import { ComboboxProps } from '@/types';
import { Loader2 } from 'lucide-react';

export interface AsyncComboboxProps<T extends string | number, TData = unknown>
  extends Omit<ComboboxProps<T>, 'options'> {
  /**
   * Query key for React Query
   */
  queryKey: unknown[];

  /**
   * Async function to fetch data
   */
  queryFn: () => Promise<TData[]>;

  /**
   * Map data item to combobox option
   */
  getOption: (item: TData) => {
    label: string;
    value: T;
    disabled?: boolean;
    description?: string;
  };

  /**
   * React Query options
   */
  queryOptions?: {
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
  };
}

/**
 * Async combobox with data loading
 */
export function AsyncCombobox<T extends string | number, TData = unknown>({
  queryKey,
  queryFn,
  getOption,
  queryOptions,
  emptyMessage = 'No options found.',
  ...comboboxProps
}: AsyncComboboxProps<T, TData>) {
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes default
    ...queryOptions,
  });

  // Map data to options
  const options = React.useMemo(() => {
    if (!data) return [];
    return data.map(getOption);
  }, [data, getOption]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-10 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center h-10 border border-destructive rounded-md px-3 text-sm text-destructive">
        Failed to load options
      </div>
    );
  }

  return (
    <GenericCombobox
      {...comboboxProps}
      options={options}
      emptyMessage={data?.length === 0 ? emptyMessage : 'No matching options.'}
    />
  );
}

/**
 * AsyncCombobox wrapped in Form components
 */
export interface FormAsyncComboboxProps<T extends string | number, TData = unknown>
  extends AsyncComboboxProps<T, TData> {
  name: string;
  label?: string;
  description?: string;
}

export function FormAsyncCombobox<T extends string | number, TData = unknown>({
  name,
  label,
  description,
  error,
  ...asyncComboboxProps
}: FormAsyncComboboxProps<T, TData>) {
  return (
    <FormCombobox
      {...asyncComboboxProps}
      name={name}
      label={label}
      description={description}
      error={error}
      options={[]} // Will be provided by AsyncCombobox
    />
  );
}
