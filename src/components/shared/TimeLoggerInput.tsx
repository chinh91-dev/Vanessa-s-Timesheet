import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type TimeLogMode = "duration" | "timeframe";

export interface TimeLoggerData {
  enabled: boolean;
  mode: TimeLogMode;
  hours: number;
  startTime: string;
  endTime: string;
}

interface TimeLoggerInputProps {
  value: TimeLoggerData;
  onChange: (data: TimeLoggerData) => void;
  disabled?: boolean;
  className?: string;
}

const QUICK_DURATIONS = [
  { label: "15m", hours: 0.25 },
  { label: "30m", hours: 0.5 },
  { label: "45m", hours: 0.75 },
  { label: "1h", hours: 1 },
  { label: "1.5h", hours: 1.5 },
  { label: "2h", hours: 2 },
];

function calculateHoursFromTimeframe(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  // Handle overnight shifts
  const diffMinutes = endMinutes >= startMinutes 
    ? endMinutes - startMinutes 
    : (24 * 60 - startMinutes) + endMinutes;
  
  return Math.round((diffMinutes / 60) * 100) / 100;
}

export function TimeLoggerInput({ 
  value, 
  onChange, 
  disabled = false,
  className 
}: TimeLoggerInputProps) {
  // Update hours when timeframe changes
  useEffect(() => {
    if (value.mode === "timeframe" && value.startTime && value.endTime) {
      const calculatedHours = calculateHoursFromTimeframe(value.startTime, value.endTime);
      if (calculatedHours !== value.hours && calculatedHours > 0) {
        onChange({ ...value, hours: calculatedHours });
      }
    }
  }, [value.startTime, value.endTime, value.mode]);

  const handleQuickDuration = (hours: number) => {
    onChange({ ...value, hours, mode: "duration" });
  };

  const handleHoursChange = (hoursStr: string) => {
    const hours = parseFloat(hoursStr) || 0;
    onChange({ ...value, hours });
  };

  return (
    <div className={cn("border rounded-lg p-3 space-y-3 bg-muted/30", className)}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="log-time"
          checked={value.enabled}
          onCheckedChange={(checked) => onChange({ ...value, enabled: checked === true })}
          disabled={disabled}
        />
        <Label htmlFor="log-time" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
          <Clock className="h-4 w-4" />
          Log time to my timesheet
        </Label>
      </div>

      {value.enabled && (
        <div className="space-y-3 pl-6">
          <RadioGroup
            value={value.mode}
            onValueChange={(mode) => onChange({ ...value, mode: mode as TimeLogMode })}
            className="flex gap-4"
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="duration" id="duration" />
              <Label htmlFor="duration" className="text-sm cursor-pointer">Duration</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="timeframe" id="timeframe" />
              <Label htmlFor="timeframe" className="text-sm cursor-pointer">Timeframe</Label>
            </div>
          </RadioGroup>

          {value.mode === "duration" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {QUICK_DURATIONS.map((dur) => (
                  <Button
                    key={dur.label}
                    type="button"
                    variant={value.hours === dur.hours ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickDuration(dur.hours)}
                    disabled={disabled}
                    className="h-7 px-2 text-xs"
                  >
                    {dur.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Or enter hours:</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={value.hours || ""}
                  onChange={(e) => handleHoursChange(e.target.value)}
                  disabled={disabled}
                  className="w-20 h-8"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {value.mode === "timeframe" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={value.startTime}
                    onChange={(e) => onChange({ ...value, startTime: e.target.value })}
                    disabled={disabled}
                    className="w-28 h-8"
                  />
                </div>
                <span className="text-muted-foreground mt-5">to</span>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="time"
                    value={value.endTime}
                    onChange={(e) => onChange({ ...value, endTime: e.target.value })}
                    disabled={disabled}
                    className="w-28 h-8"
                  />
                </div>
                {value.hours > 0 && (
                  <span className="text-sm font-medium mt-5 text-primary">
                    = {value.hours}h
                  </span>
                )}
              </div>
            </div>
          )}

          {value.hours > 0 && value.mode === "duration" && (
            <p className="text-xs text-muted-foreground">
              {value.hours} hour{value.hours !== 1 ? "s" : ""} will be logged to your timesheet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function useTimeLoggerState(initialEnabled = false): [TimeLoggerData, (data: TimeLoggerData) => void] {
  const [data, setData] = useState<TimeLoggerData>({
    enabled: initialEnabled,
    mode: "duration",
    hours: 0,
    startTime: "",
    endTime: "",
  });

  return [data, setData];
}
