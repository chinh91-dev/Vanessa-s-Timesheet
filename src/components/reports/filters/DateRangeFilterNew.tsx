
import React from "react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { ReportFiltersType } from "@/pages/timesheet/ReportsPage";

interface DateRangeFilterProps {
  filters: ReportFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<ReportFiltersType>>;
}

export const DateRangeFilterNew = ({ filters, setFilters }: DateRangeFilterProps) => {
  const handleRangeChange = (range: { from: Date; to: Date }) => {
    setFilters(prev => ({
      ...prev,
      startDate: range.from,
      endDate: range.to
    }));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Date Range</label>
      <DateRangePicker
        value={{
          from: filters.startDate,
          to: filters.endDate
        }}
        onChange={handleRangeChange}
        className="w-full"
      />
    </div>
  );
};
