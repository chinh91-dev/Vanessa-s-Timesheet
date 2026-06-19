
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWorkingDaysValidation } from "@/hooks/useWorkingDaysValidation";
import { TimesheetEntry } from "@/lib/timesheet-service";
import { getWeekStart } from "@/lib/date-utils";

interface MobileWeeklyHoursSummaryProps {
  totalHours: number;
  weeklyTarget?: number;
  entries?: TimesheetEntry[];
}

const MobileWeeklyHoursSummary: React.FC<MobileWeeklyHoursSummaryProps> = ({
  totalHours,
  weeklyTarget,
  entries = []
}) => {
  const { user } = useAuth();
  
  // Get working days validation for current week
  const currentWeekStart = getWeekStart(new Date());
  const validation = useWorkingDaysValidation(user?.id || "", entries, currentWeekStart);

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const getHoursColor = () => {
    if (!weeklyTarget) return "text-blue-600";
    const percentage = totalHours / weeklyTarget * 100;
    if (percentage < 50) return "text-amber-600";
    if (percentage < 100) return "text-blue-600";
    return "text-green-600";
  };

  const getDaysColor = () => {
    const percentage = validation.daysWorked / validation.daysAllowed * 100;
    if (percentage < 50) return "text-amber-600";
    if (percentage < 100) return "text-blue-600";
    return "text-green-600";
  };

  const getProgressPercentage = () => {
    return weeklyTarget ? Math.min((totalHours / weeklyTarget) * 100, 100) : 0;
  };

  return (
    <Card className="mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Main Hours Display */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Hours This Week</p>
          <p className={`text-3xl font-bold ${getHoursColor()}`}>
            {formatHours(totalHours)}
            {weeklyTarget && (
              <span className="text-lg text-gray-500 ml-1">/ {formatHours(weeklyTarget)}</span>
            )}
          </p>
          
          {/* Progress Bar */}
          {weeklyTarget && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {getProgressPercentage().toFixed(0)}% of weekly target
              </p>
            </div>
          )}
        </div>

        {/* Days Worked - Only show days, no hours */}
        <div className="flex items-center justify-center space-x-6 pt-4 border-t border-blue-200">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-4 w-4 text-indigo-600 mr-1" />
              <span className="text-sm text-gray-600">Days Worked</span>
            </div>
            <p className={`text-xl font-bold ${getDaysColor()}`}>
              {validation.daysWorked} / {validation.daysAllowed}
            </p>
          </div>
          
          {validation.daysRemaining > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm text-gray-600">Remaining</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {validation.daysRemaining}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileWeeklyHoursSummary;
