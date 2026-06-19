
import { DateRange } from "@/lib/date-range-utils";

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
  className?: string;
}

export interface DateRangePickerState {
  tempRange: DateRange;
  selectedPreset: string | null;
  currentMonth: Date;
}
