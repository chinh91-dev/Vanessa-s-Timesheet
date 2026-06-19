import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, CalendarClock, Settings } from "lucide-react";
interface TimesheetReminderProps {
  hasEntries: boolean;
  completeWeek: boolean;
  allDaysHaveEntries: boolean;
  isLate: boolean;
  weekProgress: number;
  daysRemaining: number;
  caughtUp: boolean;
  deadlineMessage: string;
  workingDays: number;
  weeklyTarget: number;
}
const TimesheetReminder: React.FC<TimesheetReminderProps> = ({
  hasEntries,
  completeWeek,
  allDaysHaveEntries,
  isLate,
  weekProgress,
  daysRemaining,
  caughtUp,
  deadlineMessage,
  workingDays,
  weeklyTarget
}) => {
  const navigate = useNavigate();
  const getTimesheetCardStyle = () => {
    if (!hasEntries) {
      return {
        background: "bg-yellow-50 dark:bg-yellow-950",
        border: "border-yellow-200 dark:border-yellow-800",
        title: "text-yellow-800 dark:text-yellow-200",
        text: "text-yellow-700 dark:text-yellow-300",
        button: "text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900"
      };
    } else if ((completeWeek || weekProgress >= 100) && allDaysHaveEntries) {
      return {
        background: "bg-green-50 dark:bg-green-950",
        border: "border-green-200 dark:border-green-800",
        title: "text-green-800 dark:text-green-200",
        text: "text-green-700 dark:text-green-300",
        button: "text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
      };
    } else if (isLate) {
      return {
        background: "bg-red-50 dark:bg-red-950",
        border: "border-red-200 dark:border-red-800",
        title: "text-red-800 dark:text-red-200",
        text: "text-red-700 dark:text-red-300",
        button: "text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900"
      };
    } else {
      return {
        background: "bg-amber-50 dark:bg-amber-950",
        border: "border-amber-200 dark:border-amber-800",
        title: "text-amber-800 dark:text-amber-200",
        text: "text-amber-700 dark:text-amber-300",
        button: "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
      };
    }
  };
  const cardStyle = getTimesheetCardStyle();
  return <Card className={`${cardStyle.background} ${cardStyle.border}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 ${cardStyle.title}`}>
          <AlertCircle className="h-5 w-5" />
          Weekly Timesheet Reminder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`mb-2 ${cardStyle.text}`}>
          {!hasEntries ? `You haven't entered any timesheet data for this week yet. Your current schedule is ${workingDays} working days.` : completeWeek && allDaysHaveEntries ? `Great job! You've completed your timesheet entries for this week (${workingDays} days).` : !allDaysHaveEntries ? `Please ensure you have at least one entry for each of your ${workingDays} working days.` : "All timesheet entries for this week must be completed by Friday 5:00 PM. Data will be processed over the weekend."}
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between text-sm mb-1">
            <span className={cardStyle.text}>This Week's Progress</span>
            <span className={cardStyle.text}>
              {hasEntries ? `${Math.round(weekProgress)}% Complete (${workingDays} days target)` : "No entries yet"}
            </span>
          </div>
          <Progress value={weekProgress} className="h-2" indicatorClassName={!hasEntries ? "bg-yellow-500" : completeWeek && allDaysHaveEntries ? "bg-green-500" : isLate ? "bg-red-500" : "bg-amber-500"} />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button onClick={() => navigate("/timesheet")} variant="outline" className={cardStyle.button}>
          <CalendarClock className="mr-2 h-4 w-4" />
          {hasEntries && completeWeek && allDaysHaveEntries ? "View Timesheet" : "Enter Timesheet"}
        </Button>
      </CardFooter>
    </Card>;
};
export default TimesheetReminder;