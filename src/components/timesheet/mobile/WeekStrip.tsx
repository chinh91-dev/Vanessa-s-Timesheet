import React, { useMemo } from 'react';
import { format, getDay, isSameDay, isToday, isWeekend } from 'date-fns';
import { cn } from "@/lib/utils";
import { Plus } from 'lucide-react';

interface WeekStripProps {
    weekDates: Date[];
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onAddEntry: (date: Date) => void;
    entries: any[];
    scheduledDailyHours?: { [key: string]: number };
    shouldShowWeekendColumns?: boolean;
}

export const WeekStrip: React.FC<WeekStripProps> = ({
    weekDates,
    selectedDate,
    onSelectDate,
    onAddEntry,
    entries,
    scheduledDailyHours,
    shouldShowWeekendColumns = false
}) => {
    // Filter dates based on visibility rules
    const visibleDates = useMemo(() => {
        if (shouldShowWeekendColumns) {
            return weekDates;
        }
        return weekDates.filter(date => !isWeekend(date));
    }, [weekDates, shouldShowWeekendColumns]);

    // Get scheduled hours for a specific day
    const getScheduledHours = (date: Date): number => {
        if (!scheduledDailyHours) return 8;
        const dayIndex = getDay(date);
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return scheduledDailyHours[dayMap[dayIndex]] || 0;
    };

    // Get logged hours for a specific day
    const getLoggedHours = (date: Date): number => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return entries
            .filter(e => e.entry_date === dateKey)
            .reduce((acc, curr) => acc + (curr.hours_logged || 0), 0);
    };

    return (
        <div className="bg-background border-b border-border/40 -mx-4 px-4">
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x">
                {visibleDates.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentDay = isToday(date);
                    const scheduledHours = getScheduledHours(date);
                    const loggedHours = getLoggedHours(date);
                    const isScheduled = scheduledHours > 0;
                    const hasEntries = loggedHours > 0;

                    return (
                        <div
                            key={date.toISOString()}
                            className="flex-shrink-0 flex flex-col items-center snap-start"
                        >
                            {/* Day Card */}
                            <button
                                onClick={() => onSelectDate(date)}
                                className={cn(
                                    "w-[72px] p-2 rounded-xl flex flex-col items-center transition-all",
                                    isSelected
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : isCurrentDay
                                            ? "bg-primary/10 border-2 border-primary"
                                            : "bg-card border border-border hover:bg-accent"
                                )}
                            >
                                {/* Day name */}
                                <span className={cn(
                                    "text-xs font-medium uppercase",
                                    isSelected ? "text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {format(date, 'EEE')}
                                </span>

                                {/* Day number */}
                                <span className={cn(
                                    "text-lg font-bold",
                                    isSelected ? "text-primary-foreground" : "text-foreground"
                                )}>
                                    {format(date, 'd')}
                                </span>

                                {/* Hours indicator */}
                                <span className={cn(
                                    "text-xs mt-1",
                                    isSelected
                                        ? "text-primary-foreground/80"
                                        : hasEntries
                                            ? "text-green-600 font-medium"
                                            : "text-muted-foreground"
                                )}>
                                    {hasEntries ? `${loggedHours.toFixed(2)}h` : '—'}
                                </span>
                            </button>

                            {/* Inline Add Button */}
                            <button
                                onClick={() => onAddEntry(date)}
                                disabled={!isScheduled}
                                className={cn(
                                    "mt-1.5 h-7 px-2 text-xs rounded-lg transition-all flex items-center justify-center w-full",
                                    isScheduled
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                )}
                            >
                                <Plus className="h-3 w-3 mr-0.5" />
                                Add
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeekStrip;
