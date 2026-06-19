
import React, { useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { TimesheetEntry } from "@/lib/timesheet-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveContainer } from "@/components/common/ResponsiveContainer";
import { useSmoothTransitions } from "@/hooks/useSmoothTransitions";
import { useWeeklyNavigation } from "./hooks/useWeeklyNavigation";
import { useWeeklyViewState } from "./hooks/useWeeklyViewState";
import { useWeeklyViewData } from "./hooks/useWeeklyViewData";
import { useEntryOperations } from "./hooks/useEntryOperations";
import WeekNavigation from "./WeekNavigation";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import WeeklyViewContent from "./WeeklyViewContent";
import WeeklyViewDialogs from "./WeeklyViewDialogs";
import { PullToRefresh } from "@/components/gestures/PullToRefresh";
import { FloatingActionButton } from "@/components/mobile/FloatingActionButton";
import { Plus } from "lucide-react";
import { RefreshCw } from "lucide-react";

interface WeeklyViewContainerProps {
  viewAsUserId?: string | null;
}

const WeeklyViewContainer: React.FC<WeeklyViewContainerProps> = ({ viewAsUserId }) => {
  const { user, session, userRole } = useAuth();
  const isMobile = useIsMobile();
  const { getTransitionClass } = useSmoothTransitions();
  const isAdminUser = userRole === 'admin';

  const {
    viewMode,
    toggleViewMode,
    lastUserId,
    setLastUserId,
    entryDialogOpen,
    setEntryDialogOpen,
    selectedDate,
    setSelectedDate,
    clearDialogState,
  } = useWeeklyViewState();

  const {
    currentDate,
    weekDates,
    updateWeekDates,
    navigateToPrevious,
    navigateToNext,
    navigateToCurrentWeek,
  } = useWeeklyNavigation(viewMode);

  const {
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
  } = useWeeklyViewData(weekDates, viewAsUserId);

  const { handleDragEnd } = useEntryOperations(
    weekDates,
    entries,
    () => fetchData(),
    user?.id,
    updateEntryOptimistically
  );

  const [editingEntry, setEditingEntry] = React.useState<TimesheetEntry | undefined>(undefined);

  // Track user changes and viewAs changes to force state cleanup
  useEffect(() => {
    const currentUserId = user?.id || null;
    const currentViewAsUserId = viewAsUserId || null;

    // Create a composite key to track both authenticated user and viewing user changes
    const currentCompositeKey = `${currentUserId}:${currentViewAsUserId}`;

    if (lastUserId !== currentCompositeKey) {
      console.log(`User or viewAs changed from ${lastUserId} to ${currentCompositeKey}`);
      clearComponentState();
      clearDialogState();
      setEditingEntry(undefined);
      setLastUserId(currentCompositeKey);
    }
  }, [user?.id, viewAsUserId, lastUserId, clearComponentState, clearDialogState, setLastUserId]);

  // Update week dates when current date changes
  useEffect(() => {
    updateWeekDates();
  }, [updateWeekDates]);

  // Force week view on mobile to prevent getting stuck in day view
  useEffect(() => {
    if (isMobile && viewMode === 'today') {
      // access setViewMode directly if exposed, or use toggleViewMode
      // Since useWeeklyViewState exposes setViewMode, we should destructure it
      toggleViewMode();
    }
  }, [isMobile, viewMode, toggleViewMode]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (weekDates.length > 0 && user?.id && session) {
      fetchData();
    }
  }, [fetchData, weekDates, user?.id, session]);

  // Handler for opening the entry dialog
  const handleOpenEntryDialog = useCallback((date: Date, entry?: TimesheetEntry) => {
    setSelectedDate(date);
    setEditingEntry(entry);
    setEntryDialogOpen(true);
  }, [setSelectedDate, setEntryDialogOpen]);

  // Enhanced handler for saving an entry with optimistic updates
  const handleSaveEntry = useCallback(async (savedEntry?: TimesheetEntry) => {
    console.log("=== ENTRY SAVED - USING OPTIMISTIC UPDATE ===");

    // Clear dialog state immediately for better UX
    clearDialogState();
    setEditingEntry(undefined);

    // Trigger smart refresh of entries only
    await refetchEntries();

    console.log("Entry save handling completed");
  }, [refetchEntries, clearDialogState]);

  // Security validation
  if (!user?.id || !session) {
    return <div className="text-center text-gray-500">Please sign in to view your timesheet.</div>;
  }

  // Determine the effective user ID for operations
  const effectiveUserId = viewAsUserId || user.id;

  // Determine if dialogs should be shown
  // Show dialogs if:
  // 1. User is viewing their own timesheet (no viewAsUserId)
  // 2. User is admin and viewing someone else's timesheet
  const shouldShowDialogs = !viewAsUserId || isAdminUser;

  return (
    <ResponsiveContainer
      className={getTransitionClass("space-y-4 w-full max-w-full")}
      onResize={(width) => {
        console.log(`WeeklyView container resized to: ${width}px`);
      }}
    >
      {/* Navigation - responsive component handles mobile/desktop internally */}
      <WeekNavigation
        weekDates={weekDates}
        currentDate={currentDate}
        navigateToPrevious={navigateToPrevious}
        navigateToNext={navigateToNext}
        navigateToCurrentWeek={navigateToCurrentWeek}
        error={error}
        fetchData={fetchData}
        viewMode={viewMode}
        toggleViewMode={toggleViewMode}
      />

      {/* Main Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : (
        isMobile ? (
          <PullToRefresh onRefresh={async () => await fetchData()}>
            <WeeklyViewContent
              weekDates={weekDates}
              currentDate={currentDate}
              viewMode={viewMode}
              entries={entries}
              projects={projects}
              onEntryChange={fetchData}
              onAddEntry={handleOpenEntryDialog}
              onEditEntry={handleOpenEntryDialog}
              onDragEnd={handleDragEnd}
              viewAsUserId={viewAsUserId}
            />
          </PullToRefresh>
        ) : (
          <WeeklyViewContent
            weekDates={weekDates}
            currentDate={currentDate}
            viewMode={viewMode}
            entries={entries}
            projects={projects}
            onEntryChange={fetchData}
            onAddEntry={handleOpenEntryDialog}
            onEditEntry={handleOpenEntryDialog}
            onDragEnd={handleDragEnd}
            viewAsUserId={viewAsUserId}
          />
        )
      )}

      {/* Dialogs - Show for own timesheet or when admin is viewing others */}
      {shouldShowDialogs && (
        <WeeklyViewDialogs
          userId={effectiveUserId}
          selectedDate={selectedDate}
          entryDialogOpen={entryDialogOpen}
          setEntryDialogOpen={setEntryDialogOpen}
          projects={projects}
          contracts={contracts}
          editingEntry={editingEntry}
          onSave={handleSaveEntry}
          entries={entries}
        />
      )}

      {/* Refetch loading indicator */}
      {isRefetching && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-primary text-primary-foreground px-3 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in-50">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Updating...</span>
          </div>
        </div>
      )}
    </ResponsiveContainer>
  );
};

export default WeeklyViewContainer;
