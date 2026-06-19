import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface OptimizationConfig {
  enableRequestDeduplication?: boolean;
  cacheValidationResults?: boolean;
  enableOptimisticUpdates?: boolean;
  performanceMonitoring?: boolean;
}

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Validation results cache
const validationCache = new Map<string, { result: any; timestamp: number }>();
const VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useTimesheetOptimization = (config: OptimizationConfig = {}) => {
  const {
    enableRequestDeduplication = true,
    cacheValidationResults = true,
    enableOptimisticUpdates = true,
    performanceMonitoring = true,
  } = config;

  const queryClient = useQueryClient();
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, number>>({});
  const timingRef = useRef<Record<string, number>>({});

  // Performance monitoring
  const startTiming = useCallback((operation: string) => {
    if (performanceMonitoring) {
      timingRef.current[operation] = Date.now();
    }
  }, [performanceMonitoring]);

  const endTiming = useCallback((operation: string) => {
    if (performanceMonitoring && timingRef.current[operation]) {
      const duration = Date.now() - timingRef.current[operation];
      setPerformanceMetrics(prev => ({ ...prev, [operation]: duration }));
      
      if (duration > 500) {
        console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
      }
      
      delete timingRef.current[operation];
    }
  }, [performanceMonitoring]);

  // Request deduplication
  const deduplicateRequest = useCallback(async function<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (!enableRequestDeduplication) {
      return requestFn();
    }

    if (pendingRequests.has(key)) {
      console.log(`Deduplicating request: ${key}`);
      return pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
      pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
  }, [enableRequestDeduplication]);

  // Validation caching
  const getCachedValidation = useCallback((key: string) => {
    if (!cacheValidationResults) return null;

    const cached = validationCache.get(key);
    if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL) {
      console.log(`Using cached validation: ${key}`);
      return cached.result;
    }

    if (cached) {
      validationCache.delete(key);
    }
    return null;
  }, [cacheValidationResults]);

  const setCachedValidation = useCallback((key: string, result: any) => {
    if (cacheValidationResults) {
      validationCache.set(key, { result, timestamp: Date.now() });
    }
  }, [cacheValidationResults]);

  // Optimistic updates
  const performOptimisticUpdate = useCallback(function<T>(
    queryKey: string[],
    updater: (oldData: T | undefined) => T,
    rollbackFn?: () => void
  ) {
    if (!enableOptimisticUpdates) return;

    const previousData = queryClient.getQueryData<T>(queryKey);
    
    queryClient.setQueryData<T>(queryKey, updater);

    return {
      rollback: () => {
        queryClient.setQueryData<T>(queryKey, previousData);
        rollbackFn?.();
      }
    };
  }, [enableOptimisticUpdates, queryClient]);

  // Smart invalidation
  const invalidateQueries = useCallback((
    patterns: string[],
    options: { exact?: boolean; refetchActive?: boolean } = {}
  ) => {
    const { exact = false, refetchActive = false } = options;
    
    patterns.forEach(pattern => {
      if (exact) {
        queryClient.invalidateQueries({ 
          queryKey: [pattern], 
          exact: true,
          refetchType: refetchActive ? 'active' : 'all'
        });
      } else {
        queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] === pattern,
          refetchType: refetchActive ? 'active' : 'all'
        });
      }
    });
  }, [queryClient]);

  // Cleanup validation cache periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      for (const [key, { timestamp }] of validationCache.entries()) {
        if (now - timestamp > VALIDATION_CACHE_TTL) {
          validationCache.delete(key);
        }
      }
    };

    const interval = setInterval(cleanup, 60000); // Clean every minute
    return () => clearInterval(interval);
  }, []);

  return {
    startTiming,
    endTiming,
    deduplicateRequest,
    getCachedValidation,
    setCachedValidation,
    performOptimisticUpdate,
    invalidateQueries,
    performanceMetrics,
  };
};