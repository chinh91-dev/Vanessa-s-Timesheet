import React from "react";
import { Button } from "@/components/ui/button";
import { MEETING_TYPES } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";
import type { MeetingType } from "@/lib/crm/types";

interface MeetingTypeFilterProps {
  value: MeetingType | "all";
  onChange: (value: MeetingType | "all") => void;
}

const MeetingTypeFilter: React.FC<MeetingTypeFilterProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <Button
        variant={value === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("all")}
        className="shrink-0"
      >
        All Meetings
      </Button>
      {(Object.keys(MEETING_TYPES) as MeetingType[]).map((type) => (
        <Button
          key={type}
          variant={value === type ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(type)}
          className={cn(
            "shrink-0",
            value === type && "text-white"
          )}
          style={value === type ? { backgroundColor: MEETING_TYPES[type].color } : undefined}
        >
          <div
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: MEETING_TYPES[type].color }}
          />
          {MEETING_TYPES[type].label}
        </Button>
      ))}
    </div>
  );
};

export default MeetingTypeFilter;
