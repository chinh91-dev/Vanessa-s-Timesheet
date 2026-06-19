import React from 'react';
import { Plus, CalendarOff, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isToday, isSameDay } from 'date-fns';
import { triggerHaptic } from '@/utils/haptic';

export interface DayInfo {
  date: Date;
  dayName: string;
  dayNumber: string;
  hoursLogged: number;
  isScheduled: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  isOnLeave?: boolean;
  leaveType?: string;
}

interface DayCardProps {
  day: DayInfo;
  isSelected: boolean;
  onSelect: () => void;
  onAddTime: () => void;
}

export const DayCard: React.FC<DayCardProps> = ({
  day,
  isSelected,
  onSelect,
  onAddTime,
}) => {
  const isCurrentDay = isToday(day.date);
  const canAddTime = day.isScheduled && !day.isHoliday && !day.isOnLeave;

  const handleAddTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canAddTime) {
      triggerHaptic('medium');
      onAddTime();
    } else {
      triggerHaptic('error');
    }
  };

  return (
    <div
      onClick={() => {
        triggerHaptic('selection');
        onSelect();
      }}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] cursor-pointer",
        "transition-all duration-200 ease-out",
        "active:scale-95",
        // Selected state
        isSelected && "bg-primary text-primary-foreground shadow-lg scale-105",
        // Today (not selected)
        !isSelected && isCurrentDay && "border-2 border-primary bg-primary/5",
        // Normal state
        !isSelected && !isCurrentDay && "bg-card border border-border",
        // Holiday styling
        day.isHoliday && !isSelected && "bg-orange-50 border-orange-200",
        // Leave styling
        day.isOnLeave && !isSelected && "bg-teal-50 border-teal-200",
        // Not scheduled
        !day.isScheduled && "opacity-60"
      )}
    >
      {/* Day name */}
      <span className={cn(
        "text-[10px] font-medium uppercase tracking-wide",
        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
      )}>
        {day.dayName}
      </span>

      {/* Day number */}
      <span className={cn(
        "text-xl font-bold",
        isSelected ? "text-primary-foreground" : "text-foreground"
      )}>
        {day.dayNumber}
      </span>

      {/* Hours logged */}
      <span className={cn(
        "text-sm font-medium",
        isSelected ? "text-primary-foreground" : "text-foreground",
        day.hoursLogged === 0 && !isSelected && "text-muted-foreground"
      )}>
        {day.hoursLogged > 0 ? `${day.hoursLogged}h` : '-'}
      </span>

      {/* Holiday/Leave indicator */}
      {day.isHoliday && (
        <div className={cn(
          "flex items-center gap-1 text-[9px]",
          isSelected ? "text-primary-foreground/80" : "text-orange-700"
        )}>
          <CalendarOff className="h-3 w-3" />
          <span className="truncate max-w-[50px]">{day.holidayName || 'Holiday'}</span>
        </div>
      )}

      {day.isOnLeave && !day.isHoliday && (
        <div className={cn(
          "flex items-center gap-1 text-[9px]",
          isSelected ? "text-primary-foreground/80" : "text-teal-700"
        )}>
          <Plane className="h-3 w-3" />
          <span className="truncate max-w-[50px]">{day.leaveType || 'Leave'}</span>
        </div>
      )}

      {/* Add button */}
      <Button
        size="sm"
        variant={isSelected ? "secondary" : "outline"}
        disabled={!canAddTime}
        onClick={handleAddTime}
        className={cn(
          "h-7 w-full text-[10px] px-2",
          !canAddTime && "opacity-40 cursor-not-allowed"
        )}
      >
        <Plus className="h-3 w-3 mr-0.5" />
        Add
      </Button>

      {/* Not scheduled indicator */}
      {!day.isScheduled && !day.isHoliday && !day.isOnLeave && (
        <span className={cn(
          "text-[9px]",
          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          Off
        </span>
      )}
    </div>
  );
};

export default DayCard;
