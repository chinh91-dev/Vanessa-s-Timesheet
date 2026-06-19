
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";

interface WorkScheduleSelectorProps {
  workingDays: number;
  onWorkingDaysChange: (days: number) => void;
}

const WorkScheduleSelector: React.FC<WorkScheduleSelectorProps> = ({
  workingDays,
  onWorkingDaysChange,
}) => {
  const scheduleOptions = [
    { days: 0, hours: 0, label: "0 days (0 hrs)" },
    { days: 1, hours: 8, label: "1 day (8 hrs)" },
    { days: 2, hours: 16, label: "2 days (16 hrs)" },
    { days: 3, hours: 24, label: "3 days (24 hrs)" },
    { days: 4, hours: 32, label: "4 days (32 hrs)" },
    { days: 5, hours: 40, label: "5 days (40 hrs)" },
  ];

  return (
    <div className="space-y-3 p-4 bg-muted rounded-lg border">
      <Label className="text-sm font-medium text-muted-foreground">
        Work Schedule
      </Label>
      <ToggleGroup
        type="single"
        value={workingDays.toString()}
        onValueChange={(value) => {
          if (value) {
            onWorkingDaysChange(parseInt(value, 10));
          }
        }}
        className="grid grid-cols-3 gap-2 w-full"
      >
        {scheduleOptions.map((option) => (
          <ToggleGroupItem
            key={option.days}
            value={option.days.toString()}
            className="text-xs px-2 py-2 h-auto flex flex-col items-center justify-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <span className="font-medium">{option.days} days</span>
            <span className="text-xs opacity-80">({option.hours} hrs)</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default WorkScheduleSelector;
