// Dashboard page - trigger rebuild
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import DashboardStats from "@/components/dashboard/DashboardStats";
import TimesheetReminder from "@/components/dashboard/TimesheetReminder";
import ChartSection from "@/components/dashboard/ChartSection";
import CompanyNews from "@/components/dashboard/CompanyNews";
import HelpSection from "@/components/dashboard/HelpSection";
import { useSimpleWeeklySchedule } from "@/hooks/useSimpleWeeklySchedule";
import { getWeekStart } from "@/lib/date-utils";

const Dashboard = () => {
  const { session, user } = useAuth();
  const navigate = useNavigate();

  // Get current week's schedule using the unified hook
  const weekStartDate = getWeekStart(new Date());
  const {
    effectiveDays: workingDays,
    effectiveHours: weeklyTarget,
    isLoading: scheduleLoading
  } = useSimpleWeeklySchedule(user?.id || "", weekStartDate);

  const {
    // Computed values - using correct property names
    expectedDaysToDate,
    daysLoggedToDate,
    weekProgress,
    daysRemaining,
    projectsChartData,
    customersChartData,
    deadlineMessage,

    // States
    completeWeek,
    hasEntries,
    allDaysHaveEntries,
    isTodayComplete,
    isLate,
    caughtUp,

    // Loading states
    isLoading,
    hasError,
    entriesError,
  } = useDashboardData();

  useEffect(() => {
    if (!session || !user) {
      console.log("No session or user found, redirecting to auth");
      navigate("/auth");
    }
  }, [session, user, navigate]);

  // Security check before rendering
  if (!session || !user) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-center text-muted-foreground">
          <p>Please sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  // Show loading while schedule is loading
  if (scheduleLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-center text-muted-foreground">
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Welcome back! You have <span className="font-semibold text-primary">{workingDays} days</span> of work recorded this week.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border shadow-sm">
          <span className="px-3 py-1 text-sm font-medium text-muted-foreground">Week Progress</span>
          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(weekProgress, 100)}%` }}
            />
          </div>
          <span className="text-sm font-bold text-primary">{Math.round(weekProgress)}%</span>
        </div>
      </div>

      {entriesError && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was an error loading your timesheet data. Please refresh the page.
          </AlertDescription>
        </Alert>
      )}

      <TimesheetReminder
        hasEntries={hasEntries}
        completeWeek={completeWeek}
        allDaysHaveEntries={allDaysHaveEntries}
        isLate={isLate}
        weekProgress={weekProgress}
        daysRemaining={daysRemaining}
        caughtUp={caughtUp}
        deadlineMessage={deadlineMessage}
        workingDays={workingDays}
        weeklyTarget={weeklyTarget}
      />

      {isLate && (
        <Alert variant="destructive" className="border-l-4 border-l-destructive shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Action Required</AlertTitle>
          <AlertDescription>
            It's Friday and you haven't entered any timesheet data yet. Please submit your hours before 5:00 PM today.
          </AlertDescription>
        </Alert>
      )}

      <DashboardStats
        hasEntries={hasEntries}
        expectedDaysToDate={expectedDaysToDate}
        daysLoggedToDate={daysLoggedToDate}
        weekProgress={weekProgress}
        completeWeek={completeWeek}
        allDaysHaveEntries={allDaysHaveEntries}
        isTodayComplete={isTodayComplete}
        workingDays={workingDays}
        weeklyTarget={weeklyTarget}
        isLoading={isLoading}
      />

      <ChartSection
        projectsChartData={projectsChartData}
        customersChartData={customersChartData}
        isLoading={isLoading}
        hasError={hasError}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <CompanyNews />
        <HelpSection />
      </div>
    </div>
  );
};

export default Dashboard;
