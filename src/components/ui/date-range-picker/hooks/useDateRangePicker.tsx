import { useState, useRef, useEffect } from "react";
import { startOfMonth, addMonths, subMonths, isSameDay, isBefore } from "date-fns";
import { DateRange, getCurrentISOWeek, isValidDateRange } from "@/lib/date-range-utils";
import { DateRangePickerState } from "../types";

export const useDateRangePicker = (value: DateRange, onChange: (range: DateRange) => void) => {
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Update temp range when value changes externally
  useEffect(() => {
    setTempRange(value);
  }, [value]);

  // Initialize with "This week" preset on first load
  useEffect(() => {
    const thisWeekRange = getCurrentISOWeek();
    if (!value.from || !value.to) {
      onChange(thisWeekRange);
      setSelectedPreset("this_week");
    }
  }, []);

  const handlePresetClick = (preset: any) => {
    const range = preset.range();
    setTempRange(range);
    setSelectedPreset(preset.value);
  };

  const handleApply = (close: () => void) => {
    if (isValidDateRange(tempRange)) {
      onChange(tempRange);
      close();
    }
  };

  const handleCancel = (close: () => void) => {
    setTempRange(value);
    setSelectedPreset(null);
    close();
  };

  const handleDateClick = (day: Date) => {
    setSelectedPreset(null); // Clear preset when manually selecting dates
    
    // Check if this is a single-day range and we're clicking the same day
    if (tempRange.from && tempRange.to && isSameDay(tempRange.from, tempRange.to) && isSameDay(day, tempRange.from)) {
      // Clear both dates for single-day toggle
      setTempRange({ from: undefined, to: undefined });
      return;
    }

    // Check if clicking on the from date
    if (tempRange.from && isSameDay(day, tempRange.from)) {
      // Clear from, keep to
      setTempRange({ from: undefined, to: tempRange.to });
      return;
    }

    // Check if clicking on the to date
    if (tempRange.to && isSameDay(day, tempRange.to)) {
      // Clear to, keep from
      const newRange = { from: tempRange.from, to: undefined };
      
      // If clearing to leaves only a to date, promote it to from
      if (!newRange.from && tempRange.to) {
        newRange.from = tempRange.to;
      }
      
      setTempRange(newRange);
      return;
    }

    // Normal date selection logic
    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      // Start new selection
      setTempRange({ from: day, to: undefined });
    } else if (tempRange.from && !tempRange.to) {
      // Complete the range
      if (isBefore(day, tempRange.from)) {
        // If selected date is before from, swap them
        setTempRange({ from: day, to: tempRange.from });
      } else {
        // Normal case: complete the range
        setTempRange({ from: tempRange.from, to: day });
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, close: () => void) => {
    if (event.key === 'Escape') {
      handleCancel(close);
    } else if (event.key === 'Enter' && isValidDateRange(tempRange)) {
      handleApply(close);
    }
  };

  const handlePreviousMonth = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const nextMonth = addMonths(currentMonth, 1);

  return {
    tempRange,
    selectedPreset,
    currentMonth,
    nextMonth,
    closeTimeoutRef,
    handlePresetClick,
    handleApply,
    handleCancel,
    handleDateClick,
    handleKeyDown,
    handlePreviousMonth,
    handleNextMonth,
  };
};
