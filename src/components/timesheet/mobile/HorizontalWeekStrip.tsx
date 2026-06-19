import React, { useRef, useEffect } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { DayCard, type DayInfo } from './DayCard';
import { TimesheetEntry } from '@/lib/timesheet-service';
import { cn } from '@/lib/utils';

interface HorizontalWeekStripProps {
  weekDates: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onAddTime: (date: Date) => void;
  entries: TimesheetEntry[];
  userSchedule?: {
    monday_working?: boolean;
    tuesday_working?: boolean;
    wednesday_working?: boolean;
    thursday_working?: boolean;
    friday_working?: boolean;
    saturday_working?: boolean;
    sunday_working?: boolean;
  };
  holidays?: Array<{ date: string; name: string }>;
  leaveDays?: Array<{ date: string; type: string }>;
  className?: string;
}

export const HorizontalWeekStrip: React.FC<HorizontalWeekStripProps> = ({
  weekDates,
  selectedDate,
  onDateSelect,
  onAddTime,
  entries,
  userSchedule,
  holidays = [],
  leaveDays = [],
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Calculate hours logged for a specific date
  const getHoursForDate = (date: Date): number => {
    const dateString = format(date, 'yyyy-MM-dd');
    return entries
      .filter(entry => entry.entry_date === dateString)
      .reduce((sum, entry) => sum + (entry.hours_logged || 0), 0);
  };

  // Check if day is scheduled based on user schedule
  const isDayScheduled = (date: Date): boolean => {
    if (!userSchedule) return true; // Default to scheduled if no schedule

    const dayName = format(date, 'EEEE').toLowerCase();
    const scheduleKey = `${dayName}_working` as keyof typeof userSchedule;
    return userSchedule[scheduleKey] ?? true;
  };

  // Check if day is a holiday
  const getHoliday = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateString);
  };

  // Check if day is a leave day
  const getLeave = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return leaveDays.find(l => l.date === dateString);
  };

  // Prepare day data
  const days: DayInfo[] = weekDates.map(date => {
    const holiday = getHoliday(date);
    const leave = getLeave(date);

    return {
      date,
      dayName: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      hoursLogged: getHoursForDate(date),
      isScheduled: isDayScheduled(date),
      isHoliday: !!holiday,
      holidayName: holiday?.name,
      isOnLeave: !!leave,
      leaveType: leave?.type,
    };
  });

  // Scroll to selected day on mount and when selection changes
  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      const container = containerRef.current;
      const selected = selectedRef.current;

      const containerWidth = container.offsetWidth;
      const selectedLeft = selected.offsetLeft;
      const selectedWidth = selected.offsetWidth;

      // Center the selected card
      const scrollPosition = selectedLeft - (containerWidth / 2) + (selectedWidth / 2);

      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [selectedDate]);

  return (
    <div className={cn("relative", className)}>
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {days.map((day, index) => {
            const isSelected = isSameDay(day.date, selectedDate);

            return (
              <div
                key={day.date.toISOString()}
                ref={isSelected ? selectedRef : undefined}
                className="snap-center"
              >
                <DayCard
                  day={day}
                  isSelected={isSelected}
                  onSelect={() => onDateSelect(day.date)}
                  onAddTime={() => onAddTime(day.date)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Fade edges (visual cue for scrollable content) */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};

export default HorizontalWeekStrip;
