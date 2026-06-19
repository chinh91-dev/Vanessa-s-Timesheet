import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMediaQuery } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WeeklyView from "@/components/timesheet/WeeklyView";
import TimerComponent from "@/components/timesheet/TimerComponent";
import UserSelector from "@/components/timesheet/UserSelector";
import HolidayLegend from "@/components/timesheet/HolidayLegend";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";
import { deleteAllTimesheetEntries } from "@/lib/timesheet-service";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSimpleWeeklySchedule } from "@/hooks/useSimpleWeeklySchedule";
import { getWeekStart } from "@/lib/date-utils";
import { fetchUsers, User as UserType } from "@/lib/user-service";
import { useQuery } from "@tanstack/react-query";
import { useTimesheetRealtime } from "@/hooks/useTimesheetRealtime";

const TimesheetPage = () => {
  const { user, userRole } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const isAdminUser = userRole === 'admin';

  // Enable real-time updates for timesheet entries
  useTimesheetRealtime({ userId: selectedUserId || user?.id });

  // Check for URL parameters to set initial user selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('userId');
    if (userIdParam && isAdminUser) {
      setSelectedUserId(userIdParam);
      // Clean up URL without causing page reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isAdminUser]);

  // Fetch users for getting selected user details
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(false),
    enabled: isAdminUser
  });

  // Get current week's schedule for the selected user or current user
  const targetUserId = selectedUserId || user?.id || "";
  const weekStartDate = getWeekStart(new Date());
  const {
    effectiveDays,
    effectiveHours
  } = useSimpleWeeklySchedule(targetUserId, weekStartDate);

  // Get selected user details for display
  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;
  const displayUserName = selectedUser?.full_name || selectedUser?.email || "My";

  // Redirect if no user is authenticated
  if (!user) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <p className="text-gray-500">Please sign in to view your timesheet</p>
        </div>
      </div>
    );
  }

  const handleDeleteAllEntries = async () => {
    setIsDeleting(true);
    try {
      // RLS will ensure only appropriate entries are deleted
      const deletedCount = await deleteAllTimesheetEntries();
      toast({
        title: "Entries deleted",
        description: `Successfully deleted ${deletedCount} timesheet entries.`,
      });
      // Force refresh of the WeeklyView component
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting entries:", error);
      toast({
        title: "Error",
        description: "Failed to delete timesheet entries.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleUserChange = (userId: string | null) => {
    setSelectedUserId(userId);
    setRefreshKey(prev => prev + 1); // Force refresh when switching users
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 max-w-full mx-auto">
      {/* Header section with improved mobile spacing */}
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {selectedUserId ? `${displayUserName}'s Timesheet` : "My Timesheet"}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg mt-2">
            {selectedUserId ? `View and manage ${displayUserName.toLowerCase()}'s working hours` : "Track and manage your working hours"}
            <span className="hidden sm:inline"> - {effectiveDays} days</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          {/* User Selector for Admins */}
          {isAdminUser && (
            <UserSelector
              selectedUserId={selectedUserId}
              onSelectUser={handleUserChange}
              className="sm:w-auto"
            />
          )}

          {/* Reset All Entries Removed per user request */}
        </div>
      </div>

      {/* Holiday Legend - Hidden on Mobile */}
      <div className="hidden md:block">
        <HolidayLegend />
      </div>

      {/* Weekly overview card with expanded width for larger screens */}
      <Card className="mb-6 lg:mb-8 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden border-t-4 border-t-primary w-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl lg:text-2xl font-semibold">
            Weekly Overview
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {selectedUserId ? `${displayUserName}'s time entries for the current week` : "Your time entries for the current week"}
            <span className="hidden lg:inline"> - {effectiveDays} days expected per week</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Pass viewAsUserId to WeeklyView */}
          <WeeklyView key={refreshKey} viewAsUserId={selectedUserId} />
        </CardContent>
      </Card>

      {/* Mobile timer BELOW Weekly Overview - only show for current user */}
      {isMobile && !selectedUserId && (
        <div className="mb-6">
          <TimerComponent />
        </div>
      )}

      {/* Desktop timer with consistent spacing - only show for current user */}
      {!isMobile && !selectedUserId && (
        <div className="hidden md:block">
          <TimerComponent />
        </div>
      )}
    </div>
  );
};

export default TimesheetPage;
