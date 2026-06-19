/**
 * usePageFilters Hook
 *
 * Reusable hook for managing page-level filters and search.
 * Eliminates the pattern of multiple useState calls for filters.
 */

import { useState, useCallback, useMemo } from 'react';

export interface PageFiltersState<T> {
  filters: T;
  searchTerm: string;
  hasActiveFilters: boolean;
}

export interface PageFiltersActions<T> {
  setFilters: (filters: T | ((prev: T) => T)) => void;
  updateFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setSearchTerm: (term: string) => void;
  resetFilters: () => void;
  resetAll: () => void;
}

export interface UsePageFiltersReturn<T> extends PageFiltersState<T>, PageFiltersActions<T> {}

/**
 * Hook for managing page filters
 *
 * @param initialFilters - Initial filter values
 * @param defaultFilters - Default values to reset to (defaults to initialFilters)
 *
 * @example
 * ```tsx
 * interface ProjectFilters {
 *   status: 'active' | 'inactive' | 'all';
 *   customerId: string | null;
 *   showArchived: boolean;
 * }
 *
 * const {
 *   filters,
 *   searchTerm,
 *   setSearchTerm,
 *   updateFilter,
 *   resetAll,
 *   hasActiveFilters
 * } = usePageFilters<ProjectFilters>({
 *   status: 'active',
 *   customerId: null,
 *   showArchived: false
 * });
 * ```
 */
export function usePageFilters<T extends Record<string, unknown>>(
  initialFilters: T,
  defaultFilters?: T
): UsePageFiltersReturn<T> {
  const defaults = defaultFilters || initialFilters;

  const [filters, setFilters] = useState<T>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaults);
  }, [defaults]);

  const resetAll = useCallback(() => {
    setFilters(defaults);
    setSearchTerm('');
  }, [defaults]);

  // Check if any filters differ from defaults
  const hasActiveFilters = useMemo(() => {
    if (searchTerm) return true;

    return Object.keys(filters).some(
      (key) => filters[key as keyof T] !== defaults[key as keyof T]
    );
  }, [filters, defaults, searchTerm]);

  return {
    // State
    filters,
    searchTerm,
    hasActiveFilters,

    // Actions
    setFilters,
    updateFilter,
    setSearchTerm,
    resetFilters,
    resetAll,
  };
}
