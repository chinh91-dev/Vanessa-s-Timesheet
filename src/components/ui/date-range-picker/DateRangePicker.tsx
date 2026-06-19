
import React from "react";
import { Popover } from "@headlessui/react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateRangeDisplay, DateRange } from "@/lib/date-range-utils";
import { DateRangePickerProps } from "./types";
import { useDateRangePicker } from "./hooks/useDateRangePicker";
import { PresetsList } from "./PresetsList";
import { ActionButtons } from "./ActionButtons";
import { DualCalendar } from "./DualCalendar";

export const DateRangePicker = ({ 
  value, 
  onChange, 
  disabled = false,
  className 
}: DateRangePickerProps) => {
  const {
    tempRange,
    selectedPreset,
    currentMonth,
    nextMonth,
    handlePresetClick,
    handleApply,
    handleCancel,
    handleDateClick,
    handleKeyDown,
    handlePreviousMonth,
    handleNextMonth,
  } = useDateRangePicker(value, onChange);

  return (
    <div className={cn("relative", className)}>
      <Popover>
        {({ open, close }) => (
          <>
            <Popover.Button
              disabled={disabled}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm bg-popover border border-input rounded-lg shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
                disabled && "opacity-50 cursor-not-allowed",
                open && "ring-2 ring-ring border-ring"
              )}
              onKeyDown={(e) => handleKeyDown(e, close)}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {formatDateRangeDisplay(value)}
                </span>
              </div>
            </Popover.Button>

            <Popover.Panel className="absolute z-50 mt-2 bg-popover border border-border rounded-lg shadow-lg">
              <div className="flex" onKeyDown={(e) => handleKeyDown(e, close)}>
                {/* Left Sidebar with Presets */}
                <div className="w-48 p-4 border-r border-border">
                  <PresetsList
                    selectedPreset={selectedPreset}
                    onPresetClick={handlePresetClick}
                  />
                  
                  <ActionButtons
                    tempRange={tempRange}
                    onApply={handleApply}
                    onCancel={handleCancel}
                    close={close}
                  />
                </div>

                {/* Right Side - Dual Calendar */}
                <DualCalendar
                  tempRange={tempRange}
                  currentMonth={currentMonth}
                  nextMonth={nextMonth}
                  onDateSelect={handleDateClick}
                  onPreviousMonth={handlePreviousMonth}
                  onNextMonth={handleNextMonth}
                />
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>
    </div>
  );
};
