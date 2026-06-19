// ============================================================================
// MonthPicker — first-of-month YYYY-MM-01 picker for the forecast editor
// ----------------------------------------------------------------------------
// HTML <input type="month"> reports YYYY-MM; we normalise to first-of-month
// ISO on every change so the upstream wrapper passes the SQL CHECK
// (quarterly_forecast.month must be the first day of a month).
// ============================================================================

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";

const toFirstOfMonthIso = (raw: string): string => {
  // raw is YYYY-MM
  const d = parseISO(`${raw}-01`);
  if (Number.isNaN(d.getTime())) return raw;
  return format(startOfMonth(d), "yyyy-MM-dd");
};

export interface MonthPickerProps {
  /** ISO yyyy-mm-01. */
  value: string;
  onChange: (next: string) => void;
}

const MonthPicker = ({ value, onChange }: MonthPickerProps) => {
  const yyyymm = value.slice(0, 7); // browser <input type="month"> format

  const shift = (n: number) => {
    const d = parseISO(`${yyyymm}-01`);
    if (Number.isNaN(d.getTime())) return;
    onChange(format(startOfMonth(addMonths(d, n)), "yyyy-MM-dd"));
  };

  const goThis = () => {
    onChange(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  };

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Month selector"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => shift(-1)}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Input
        type="month"
        value={yyyymm}
        onChange={(e) => onChange(toFirstOfMonthIso(e.target.value))}
        className="w-40"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => shift(1)}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goThis}
        className="gap-1"
        aria-label="Jump to this month"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">This month</span>
      </Button>
    </div>
  );
};

export default MonthPicker;
