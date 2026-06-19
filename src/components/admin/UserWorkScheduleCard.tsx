
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import WorkScheduleSelector from "@/components/timesheet/weekly-view/WorkScheduleSelector";
import { useWorkSchedule } from "@/hooks/useWorkSchedule";
import type { UserWithRole } from "@/lib/user-service";

interface UserWorkScheduleCardProps {
  user: UserWithRole;
}

const UserWorkScheduleCard: React.FC<UserWorkScheduleCardProps> = ({ user }) => {
  const { workingDays, updateWorkingDays, loading, error } = useWorkSchedule(user.id);

  const handleWorkingDaysChange = async (days: number) => {
    console.log(`Admin updating work schedule for ${user.email}: ${days} days`);
    await updateWorkingDays(days);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {user.full_name || user.email}
          </CardTitle>
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
            {user.role || "employee"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">
            Failed to load work schedule
          </div>
        ) : (
          <>
            <WorkScheduleSelector
              workingDays={workingDays}
              onWorkingDaysChange={handleWorkingDaysChange}
            />
            <div className="mt-3 text-sm text-muted-foreground">
              Working days per week: {workingDays} days
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserWorkScheduleCard;
