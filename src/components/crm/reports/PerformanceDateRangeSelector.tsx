import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export interface DateRangeType {
  from: Date;
  to: Date;
}

interface PerformanceDateRangeSelectorProps {
  value: DateRangeType;
  onChange: (range: DateRangeType) => void;
}

type PresetKey = "today" | "yesterday" | "this_week" | "this_month" | "custom";

const presets: { key: PresetKey; label: string; getRange: () => DateRangeType }[] = [
  {
    key: "today",
    label: "Today",
    getRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "yesterday",
    label: "Yesterday",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    key: "this_week",
    label: "This Week",
    getRange: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    key: "this_month",
    label: "This Month",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
];

const getActivePreset = (value: DateRangeType): PresetKey => {
  for (const preset of presets) {
    const range = preset.getRange();
    if (
      value.from.getTime() === range.from.getTime() &&
      value.to.getTime() === range.to.getTime()
    ) {
      return preset.key;
    }
  }
  return "custom";
};

export function PerformanceDateRangeSelector({
  value,
  onChange,
}: PerformanceDateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activePreset = getActivePreset(value);

  const handlePresetClick = (preset: typeof presets[0]) => {
    onChange(preset.getRange());
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // If no from date or both dates set, start new selection
    if (!value.from || (value.from && value.to)) {
      onChange({
        from: startOfDay(date),
        to: endOfDay(date),
      });
    } else {
      // Complete the range
      if (date < value.from) {
        onChange({
          from: startOfDay(date),
          to: endOfDay(value.from),
        });
      } else {
        onChange({
          from: value.from,
          to: endOfDay(date),
        });
      }
      setIsOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.key}
          variant={activePreset === preset.key ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(preset)}
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activePreset === "custom" ? "default" : "outline"}
            size="sm"
            className={cn("gap-2", activePreset === "custom" && "min-w-[200px]")}
          >
            <CalendarIcon className="h-4 w-4" />
            {activePreset === "custom" ? (
              <>
                {format(value.from, "dd MMM")} - {format(value.to, "dd MMM yyyy")}
              </>
            ) : (
              "Custom"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value.from}
            onSelect={handleDateSelect}
            disabled={(date) => date > new Date()}
            initialFocus
            className="pointer-events-auto"
          />
          <div className="p-3 border-t text-xs text-muted-foreground">
            {value.from && !value.to
              ? "Click another date to complete range"
              : "Click a date to start selection"}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
