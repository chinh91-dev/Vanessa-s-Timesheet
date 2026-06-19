
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { DateRange, isFutureDate } from "@/lib/date-range-utils";

interface DualCalendarProps {
  tempRange: DateRange;
  currentMonth: Date;
  nextMonth: Date;
  onDateSelect: (date: Date | undefined, type: 'from' | 'to') => void;
  onPreviousMonth: (event: React.MouseEvent) => void;
  onNextMonth: (event: React.MouseEvent) => void;
}

export const DualCalendar = ({ 
  tempRange, 
  currentMonth, 
  nextMonth, 
  onDateSelect, 
  onPreviousMonth, 
  onNextMonth 
}: DualCalendarProps) => {
  // Custom components to hide Calendar navigation
  const customComponents = {
    IconLeft: () => null,
    IconRight: () => null,
    Caption: ({ displayMonth }: { displayMonth: Date }) => null,
  };

  return (
    <div className="p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPreviousMonth}
          className="p-2 hover:bg-accent rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-8 text-sm font-medium">
          <span>{format(currentMonth, "MMMM yyyy")}</span>
          <span>{format(nextMonth, "MMMM yyyy")}</span>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-2 hover:bg-accent rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dual Calendars */}
      <div className="flex gap-4">
        {/* Current Month Calendar */}
        <Calendar
          mode="range"
          selected={{
            from: tempRange.from,
            to: tempRange.to,
          }}
          onSelect={(range) => {
            if (range?.from) {
              onDateSelect(range.from, 'from');
            }
            if (range?.to) {
              onDateSelect(range.to, 'to');
            }
          }}
          month={currentMonth}
          disabled={isFutureDate}
          weekStartsOn={1}
          className="p-0"
          components={customComponents}
        />

        {/* Next Month Calendar */}
        <Calendar
          mode="range"
          selected={{
            from: tempRange.from,
            to: tempRange.to,
          }}
          onSelect={(range) => {
            if (range?.from) {
              onDateSelect(range.from, 'from');
            }
            if (range?.to) {
              onDateSelect(range.to, 'to');
            }
          }}
          month={nextMonth}
          disabled={isFutureDate}
          weekStartsOn={1}
          className="p-0"
          components={customComponents}
        />
      </div>
    </div>
  );
};
