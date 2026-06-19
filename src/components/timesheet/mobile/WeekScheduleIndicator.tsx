import React from 'react';
import { cn } from '@/lib/utils';

interface WeeklyWorkSchedule {
  monday_working?: boolean;
  tuesday_working?: boolean;
  wednesday_working?: boolean;
  thursday_working?: boolean;
  friday_working?: boolean;
  saturday_working?: boolean;
  sunday_working?: boolean;
}

interface WeekScheduleIndicatorProps {
  weekSchedule: WeeklyWorkSchedule;
  className?: string;
}

const DAYS = [
  { key: 'monday_working', short: 'M', label: 'Monday' },
  { key: 'tuesday_working', short: 'T', label: 'Tuesday' },
  { key: 'wednesday_working', short: 'W', label: 'Wednesday' },
  { key: 'thursday_working', short: 'T', label: 'Thursday' },
  { key: 'friday_working', short: 'F', label: 'Friday' },
  { key: 'saturday_working', short: 'S', label: 'Saturday' },
  { key: 'sunday_working', short: 'S', label: 'Sunday' },
] as const;

/**
 * Visual indicator showing the user's weekly work schedule at a glance
 */
export const WeekScheduleIndicator: React.FC<WeekScheduleIndicatorProps> = ({
  weekSchedule,
  className,
}) => {
  const workingDays = DAYS.filter(
    day => weekSchedule[day.key as keyof WeeklyWorkSchedule]
  ).length;

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2.5 bg-muted/50 rounded-lg",
      className
    )}>
      {/* Day indicators */}
      <div className="flex items-center gap-1.5">
        {DAYS.map((day, index) => {
          const isWorking = weekSchedule[day.key as keyof WeeklyWorkSchedule];

          return (
            <div
              key={day.key}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                "transition-colors duration-200",
                isWorking
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              title={`${day.label}: ${isWorking ? 'Working' : 'Off'}`}
            >
              {day.short}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{workingDays}</span> days/week
      </div>
    </div>
  );
};

export default WeekScheduleIndicator;
