import React from 'react';
import { cn } from "@/lib/utils";
import { Clock, TrendingUp } from 'lucide-react';

interface QuickStatsProps {
    totalHours: number;
    expectedHours: number;
    daysWorked: number;
    expectedDays: number;
    className?: string;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
    totalHours,
    expectedHours,
    daysWorked,
    expectedDays,
    className
}) => {
    // Calculate percentage
    const hoursPercentage = expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;

    // Determine status
    const isOnTrack = hoursPercentage >= 90 && hoursPercentage <= 110;
    const isOvertime = hoursPercentage > 110;

    // Status Messages
    let message = "";
    let statusColorClass = "";
    let progressColorClass = "";

    if (isOnTrack) {
        message = "On track for this week";
        statusColorClass = "text-green-600";
        progressColorClass = "bg-green-500";
    } else if (isOvertime) {
        const overtimeHours = totalHours - expectedHours;
        message = `${overtimeHours.toFixed(2)}h overtime`;
        statusColorClass = "text-orange-600";
        progressColorClass = "bg-orange-500";
    } else {
        // Undertime
        const remainingHours = expectedHours - totalHours;
        message = `${remainingHours.toFixed(2)}h remaining`;
        statusColorClass = "text-blue-600";
        progressColorClass = "bg-blue-500";
    }

    return (
        <div className={cn("p-4 bg-card rounded-xl shadow-sm border border-border", className)}>
            {/* Stats Row */}
            <div className="flex justify-between items-start mb-4">
                {/* Total Hours */}
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total Hours</p>
                        <p className="text-xl font-bold text-foreground">{totalHours.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">of {expectedHours}h</p>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-xl font-bold text-foreground">{Math.round(hoursPercentage)}%</p>
                        <p className="text-xs text-muted-foreground">{daysWorked}/{expectedDays} days</p>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            <p className={cn("text-sm font-medium mb-2", statusColorClass)}>
                {message}
            </p>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-500 ease-out", progressColorClass)}
                    style={{ width: `${Math.min(hoursPercentage, 100)}%` }}
                />
            </div>
        </div>
    );
};

export default QuickStats;
