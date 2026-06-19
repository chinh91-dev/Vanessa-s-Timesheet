import React, { useState, useEffect } from "react";
import WorkLocationCalendar from "@/components/work-location/WorkLocationCalendar";
import WorkLocationManager from "@/components/work-location/WorkLocationManager";
import DailyLocationCheckin from "@/components/work-location/DailyLocationCheckin";
import UserVisibilityPanel from "@/components/work-location/UserVisibilityPanel";
import DailyLocationStatusMonitor from "@/components/work-location/DailyLocationStatusMonitor";
import ManualReminderTrigger from "@/components/work-location/ManualReminderTrigger";
import { useAuth } from "@/context/AuthContext";
import { fetchUsersWithWorkSchedules } from "@/lib/user-service";

const WorkLocationPage = () => {
  const { userRole } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const isAdmin = userRole === 'admin';

  // Initialize selectedUsers with all users on component mount
  useEffect(() => {
    const initializeUsers = async () => {
      try {
        const users = await fetchUsersWithWorkSchedules();
        setSelectedUsers(users.map(user => user.id));
      } catch (error) {
        console.error('Failed to load users for initialization:', error);
      }
    };

    if (selectedUsers.length === 0) {
      initializeUsers();
    }
  }, []);

  const handleAddLocation = (date: string) => {
    setSelectedDate(date);
  };

  const handleLocationAdded = () => {
    setRefreshKey(prev => prev + 1);
    setSelectedDate(undefined);
  };

  const handleUsersChange = (userIds: string[]) => {
    setSelectedUsers(userIds);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-background dark:to-background p-2 sm:p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4 md:space-y-6">
          {/* Header - Mobile Optimized */}
          <div className="text-center space-y-1 sm:space-y-2 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              Work Location Calendar
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto hidden sm:block">
              Coordinate with your team by viewing and managing work locations.
              See who's in the office, working remotely, or at client sites.
            </p>
          </div>

          {/* Main Content - Mobile Optimized Order */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* MOBILE: Daily Check-in ALWAYS at top on mobile */}
            <div className="block lg:hidden w-full">
              <DailyLocationCheckin />
            </div>

            {/* Desktop Layout: Daily Check-in and Team Member Selection side by side */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4 xl:gap-6">
              {/* Daily Check-in */}
              <DailyLocationCheckin />

              {/* Team Member Visibility Panel */}
              <UserVisibilityPanel
                selectedUsers={selectedUsers}
                onUsersChange={handleUsersChange}
              />
            </div>

            {/* Mobile: Team Member Visibility Panel after check-in */}
            <div className="block lg:hidden w-full">
              <UserVisibilityPanel
                selectedUsers={selectedUsers}
                onUsersChange={handleUsersChange}
              />
            </div>

            {/* Admin-only components */}
            <DailyLocationStatusMonitor />
            <ManualReminderTrigger />

            {/* Work Calendar - Full Width - Mobile Optimized */}
            <div className="w-full">
              <WorkLocationCalendar
                key={refreshKey}
                onAddLocation={handleAddLocation}
                selectedUsers={selectedUsers}
                onUsersChange={handleUsersChange}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkLocationPage;