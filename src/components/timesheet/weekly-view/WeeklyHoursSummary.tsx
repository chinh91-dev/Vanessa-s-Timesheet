
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar } from "lucide-react";
import { TimesheetEntry } from "@/lib/timesheet-service";

interface WeeklyHoursSummaryProps {
  totalHours: number;
  weeklyTarget?: number;
  entries?: TimesheetEntry[];
}

const WeeklyHoursSummary: React.FC<WeeklyHoursSummaryProps> = ({
  totalHours,
  weeklyTarget,
  entries = []
}) => {
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

  // Calculate unique days worked from entries
  const daysWorked = new Set(entries.map(e => {
    const dateStr = String(e.entry_date).split('T')[0];
    return dateStr;
  })).size;

  return (
    <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Hours This Week</p>
              <p className={`text-2xl font-bold ${getHoursColor()}`}>
                {formatHours(totalHours)} hours
              </p>
            </div>
          </div>
          
          {/* Days Worked Summary */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Days Worked This Week</p>
              <p className="text-xl font-bold text-indigo-600">
                {daysWorked} {daysWorked === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyHoursSummary;
