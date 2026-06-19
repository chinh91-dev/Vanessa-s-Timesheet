
import React, { useState, useMemo, useEffect } from 'react';
import { format, getDay } from 'date-fns'; // Removed unused imports: startOfWeek, addDays
import { WeekStrip } from './WeekStrip';
import { QuickStats } from './QuickStats';
import { SwipeableEntryCard } from './SwipeableEntryCard';
import { TimesheetEntry } from '@/lib/timesheet-service';
import { cn } from "@/lib/utils";
import { Clock } from 'lucide-react';

interface MobileTimesheetViewProps {
    weekDates: Date[];
    entries: TimesheetEntry[];
    onEditEntry: (entry: TimesheetEntry) => void;
    onDeleteEntry: (entry: TimesheetEntry) => void;
    onEntryChange: () => void;
    onAddEntry: (date: Date) => void;
    scheduledDailyHours?: { [key: string]: number };
    shouldShowWeekendColumns?: boolean;
    className?: string;
}

export const MobileTimesheetView: React.FC<MobileTimesheetViewProps> = ({
    weekDates,
    entries,
    onEditEntry,
    onDeleteEntry,
    onEntryChange,
    onAddEntry,
    scheduledDailyHours,
    shouldShowWeekendColumns = false,
    className
}) => {
    // Default to first day of the week if selected date is not in current week
    const [selectedDate, setSelectedDate] = useState<Date>(weekDates[0]);

    // Update selected date when week changes, trying to keep the same day index if possible
    // or defaulting to the first day of the new week
    useEffect(() => {
        const isSelectedInWeek = weekDates.some(d =>
            format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
        );

        if (!isSelectedInWeek && weekDates.length > 0) {
            setSelectedDate(weekDates[0]);
        }
    }, [weekDates, selectedDate]);

    // Calculate daily totals
    const dailyTotals = useMemo(() => {
        const totals = new Map<string, number>();
        entries.forEach(entry => {
            const dateKey = entry.entry_date;
            totals.set(dateKey, (totals.get(dateKey) || 0) + (entry.hours_logged || 0));
        });
        return totals;
    }, [entries]);

    // Filter entries for selected date
    const selectedDateEntries = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return entries
            .filter(entry => entry.entry_date === dateKey && entry.id)
            .map(entry => ({ ...entry, id: entry.id as string }));
    }, [entries, selectedDate]);

    // Calculate total hours for the week
    const totalWeekHours = entries.reduce((acc, curr) => acc + (curr.hours_logged || 0), 0);

    // Calculate expected hours from schedule (Mon-Fri)
    const expectedWeekHours = useMemo(() => {
        if (!scheduledDailyHours) return 40;
        return (
            (scheduledDailyHours.monday || 0) +
            (scheduledDailyHours.tuesday || 0) +
            (scheduledDailyHours.wednesday || 0) +
            (scheduledDailyHours.thursday || 0) +
            (scheduledDailyHours.friday || 0)
        );
    }, [scheduledDailyHours]);

    // Calculate days worked
    const daysWorked = useMemo(() => {
        return dailyTotals.size;
    }, [dailyTotals]);

    // Calculate expected days (days with scheduled hours)
    const expectedDays = useMemo(() => {
        if (!scheduledDailyHours) return 5;
        let count = 0;
        if ((scheduledDailyHours.monday || 0) > 0) count++;
        if ((scheduledDailyHours.tuesday || 0) > 0) count++;
        if ((scheduledDailyHours.wednesday || 0) > 0) count++;
        if ((scheduledDailyHours.thursday || 0) > 0) count++;
        if ((scheduledDailyHours.friday || 0) > 0) count++;
        return count;
    }, [scheduledDailyHours]);

    return (
        <div className={cn("flex flex-col h-full bg-background space-y-4 p-4 pb-24", className)}>
            {/* Header removed as it is redundant with page title */}

            {/* Week Strip with inline Add buttons */}
            <WeekStrip
                weekDates={weekDates}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onAddEntry={onAddEntry}
                entries={entries}
                scheduledDailyHours={scheduledDailyHours}
                shouldShowWeekendColumns={shouldShowWeekendColumns}
            />

            {/* Quick Stats */}
            <QuickStats
                totalHours={totalWeekHours}
                expectedHours={expectedWeekHours}
                daysWorked={daysWorked}
                expectedDays={expectedDays}
            />

            {/* Selected Date Header */}
            <div className="flex items-center justify-between px-1 mt-2">
                <div>
                    <h3 className="font-medium text-foreground">
                        {format(selectedDate, 'EEEE, MMMM d')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {selectedDateEntries.length} {selectedDateEntries.length === 1 ? 'entry' : 'entries'}
                    </p>
                </div>
            </div>

            {/* Entries List */}
            <div className="space-y-2">
                {selectedDateEntries.length > 0 ? (
                    selectedDateEntries.map(entry => (
                        <SwipeableEntryCard
                            key={entry.id}
                            entry={entry}
                            onEdit={onEditEntry}
                            onDelete={onDeleteEntry}
                            onClick={onEditEntry}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 bg-card rounded-xl border border-border">
                        <div className="p-3 rounded-full bg-muted mb-3">
                            <Clock className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No entries for this day</p>
                        <p className="text-xs text-muted-foreground text-center">
                            Tap "+ Add" above to log your time
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};


export default MobileTimesheetView;
