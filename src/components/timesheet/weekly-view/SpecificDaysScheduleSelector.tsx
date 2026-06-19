import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, Calendar } from "lucide-react";

interface ScheduleDay {
  name: string;
  hours: number;
  enabled: boolean;
}

interface SpecificDaysScheduleSelectorProps {
  schedule: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  onScheduleChange: (schedule: any) => void;
  disabled?: boolean;
}

const SpecificDaysScheduleSelector: React.FC<SpecificDaysScheduleSelectorProps> = ({
  schedule,
  onScheduleChange,
  disabled = false,
}) => {
  const days = [
    { key: 'monday', name: 'Monday', hours: schedule.monday },
    { key: 'tuesday', name: 'Tuesday', hours: schedule.tuesday },
    { key: 'wednesday', name: 'Wednesday', hours: schedule.wednesday },
    { key: 'thursday', name: 'Thursday', hours: schedule.thursday },
    { key: 'friday', name: 'Friday', hours: schedule.friday },
    { key: 'saturday', name: 'Saturday', hours: schedule.saturday },
    { key: 'sunday', name: 'Sunday', hours: schedule.sunday },
  ];

  const totalHours = Object.values(schedule).reduce((sum, hours) => sum + hours, 0);
  const workingDays = Object.values(schedule).filter(hours => hours > 0).length;

  const handleHoursChange = (dayKey: string, hours: number) => {
    onScheduleChange({
      ...schedule,
      [dayKey]: Math.max(0, Math.min(24, hours)),
    });
  };

  const toggleDayEnabled = (dayKey: string) => {
    const currentHours = schedule[dayKey as keyof typeof schedule];
    onScheduleChange({
      ...schedule,
      [dayKey]: currentHours > 0 ? 0 : 8,
    });
  };

  const presetSchedules = [
    { name: "No Work", hours: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 } },
    { name: "1 Day (8h)", hours: { monday: 8, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 } },
    { name: "2 Days (16h)", hours: { monday: 8, tuesday: 8, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 } },
    { name: "3 Days (24h)", hours: { monday: 8, tuesday: 8, wednesday: 8, thursday: 0, friday: 0, saturday: 0, sunday: 0 } },
    { name: "4 Days (32h)", hours: { monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 0, saturday: 0, sunday: 0 } },
    { name: "5 Days (40h)", hours: { monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 } },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Work Schedule
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {workingDays} days
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {totalHours}h total
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Presets */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Presets</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {presetSchedules.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => onScheduleChange(preset.hours)}
                disabled={disabled}
                className="text-xs h-auto py-2"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Individual Day Configuration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Daily Hours</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {days.map((day) => (
              <div key={day.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Button
                    variant={day.hours > 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDayEnabled(day.key)}
                    disabled={disabled}
                    className="h-6 w-6 p-0"
                  >
                    {day.hours > 0 ? "✓" : ""}
                  </Button>
                  <Label className="text-sm font-medium min-w-[70px]">
                    {day.name}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={day.hours}
                    onChange={(e) => handleHoursChange(day.key, parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-xs text-muted-foreground">hours</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Working Days:</span>
              <span className="font-medium">{workingDays}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Hours:</span>
              <span className="font-medium">{totalHours}h</span>
            </div>
            <div className="flex justify-between">
              <span>Average per Day:</span>
              <span className="font-medium">
                {workingDays > 0 ? (totalHours / workingDays).toFixed(2) : 0}h
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecificDaysScheduleSelector;