
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUserProjects,
  fetchTimesheetEntries,
  Project,
  TimesheetEntry,
} from "@/lib/timesheet-service";
import { fetchUserContracts } from "@/lib/contract/user-contract-service";
import { fetchUserProjectsById, fetchUserContractsById } from "@/lib/timesheet/user-specific-service";
import { Contract } from "@/lib/contract-service";
import { toast } from "@/hooks/use-toast";
import { useTimesheetOptimization } from "@/hooks/useTimesheetOptimization";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useWeeklyViewData = (weekDates: Date[], viewAsUserId?: string | null) => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const { 
    deduplicateRequest, 
    startTiming, 
    endTiming, 
    performOptimisticUpdate,
    invalidateQueries
  } = useTimesheetOptimization();

  // Determine which user ID to use for data fetching
  const targetUserId = viewAsUserId || user?.id;

  // Generate stable query keys
  const projectsQueryKey = useMemo(() => 
    ['timesheet-projects', targetUserId, viewAsUserId !== user?.id], 
    [targetUserId, viewAsUserId, user?.id]
  );
  
  const contractsQueryKey = useMemo(() => 
    ['timesheet-contracts', targetUserId, viewAsUserId !== user?.id], 
    [targetUserId, viewAsUserId, user?.id]
  );
  
  const entriesQueryKey = useMemo(() => 
    ['timesheet-entries', targetUserId, weekDates[0]?.toISOString(), weekDates[weekDates.length - 1]?.toISOString()], 
    [targetUserId, weekDates]
  );

  // Projects query with caching and deduplication
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: projectsQueryKey,
    queryFn: () => deduplicateRequest(
      `projects-${targetUserId}-${viewAsUserId !== user?.id}`,
      async () => {
        startTiming('fetch-projects');
        console.log("Fetching projects for user:", targetUserId);
        
        const result = viewAsUserId && viewAsUserId !== user?.id
          ? await fetchUserProjectsById(viewAsUserId)
          : await fetchUserProjects();
        
        endTiming('fetch-projects');
        return result;
      }
    ),
    enabled: !!targetUserId && !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Contracts query with caching and deduplication
  const { data: contracts = [], isLoading: contractsLoading, error: contractsError } = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => deduplicateRequest(
      `contracts-${targetUserId}-${viewAsUserId !== user?.id}`,
      async () => {
        startTiming('fetch-contracts');
        console.log("Fetching contracts for user:", targetUserId);
        
        const result = viewAsUserId && viewAsUserId !== user?.id
          ? await fetchUserContractsById(viewAsUserId)
          : await fetchUserContracts();
        
        endTiming('fetch-contracts');
        return result;
      }
    ),
    enabled: !!targetUserId && !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Entries query with caching and deduplication
  const { data: entries = [], isLoading: entriesLoading, error: entriesError, refetch: refetchEntries, isFetching: entriesFetching } = useQuery({
    queryKey: entriesQueryKey,
    queryFn: () => deduplicateRequest(
      `entries-${targetUserId}-${weekDates[0]?.toISOString()}-${weekDates[weekDates.length - 1]?.toISOString()}`,
      async () => {
        startTiming('fetch-entries');
        console.log("Fetching entries for date range:", weekDates[0], "to", weekDates[weekDates.length - 1]);
        
        const result = await fetchTimesheetEntries(
          weekDates[0],
          weekDates[weekDates.length - 1],
          { includeUserData: true, forceUserId: targetUserId }
        );
        
        endTiming('fetch-entries');
        return result;
      }
    ),
    enabled: !!targetUserId && !!session && weekDates.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combined loading and error states
  const loading = projectsLoading || contractsLoading || entriesLoading;
  const error = projectsError?.message || contractsError?.message || entriesError?.message || null;

  // Refetching state (when data is being refreshed but not initial load)
  const isRefetching = entriesFetching && !entriesLoading;

  // Clear component state by invalidating queries
  const clearComponentState = useCallback(() => {
    console.log("=== CLEARING WEEKLY VIEW DATA STATE ===");
    invalidateQueries(['timesheet-projects', 'timesheet-contracts', 'timesheet-entries']);
  }, [invalidateQueries]);

  // Enhanced fetchData function with optimistic updates
  const fetchData = useCallback(async () => {
    if (!user?.id || !session) {
      console.log("No authenticated user or session found, skipping data fetch");
      return;
    }

    startTiming('fetch-data');
    console.log("=== REFRESHING TIMESHEET DATA ===");

    try {
      // Use smart invalidation to refresh only entries
      invalidateQueries(['timesheet-entries'], { exact: false, refetchActive: true });
      
      endTiming('fetch-data');
    } catch (error) {
      console.error("Error refreshing timesheet data:", error);
      endTiming('fetch-data');
      
      toast({
        title: "Error loading data",
        description: "There was a problem loading the timesheet data. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [user?.id, session, invalidateQueries, startTiming, endTiming]);

  // Optimistic entry update
  const updateEntryOptimistically = useCallback((
    updatedEntry: TimesheetEntry,
    operation: 'create' | 'update' | 'delete'
  ) => {
    return performOptimisticUpdate<TimesheetEntry[]>(
      entriesQueryKey,
      (oldEntries = []) => {
        switch (operation) {
          case 'create':
            return [...oldEntries, updatedEntry];
          case 'update':
            return oldEntries.map(entry => 
              entry.id === updatedEntry.id ? updatedEntry : entry
            );
          case 'delete':
            return oldEntries.filter(entry => entry.id !== updatedEntry.id);
          default:
            return oldEntries;
        }
      }
    );
  }, [performOptimisticUpdate, entriesQueryKey]);

  return {
    projects,
    contracts,
    entries,
    loading,
    error,
    fetchData,
    clearComponentState,
    updateEntryOptimistically,
    refetchEntries,
    isRefetching,
  };
};
