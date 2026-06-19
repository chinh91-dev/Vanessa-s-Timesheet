
import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportFiltersType } from "@/pages/timesheet/ReportsPage";

interface DateRangeFilterProps {
  filters: ReportFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<ReportFiltersType>>;
}

export const DateRangeFilter = ({ filters, setFilters }: DateRangeFilterProps) => {
  const handleStartDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setFilters(prev => {
      const newFilters = { ...prev, startDate: date };
      
      // If the selected start date is after the current end date,
      // automatically adjust the end date to match the start date
      if (prev.endDate && date > prev.endDate) {
        newFilters.endDate = date;
      }
      
      return newFilters;
    });
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setFilters(prev => {
      const newFilters = { ...prev, endDate: date };
      
      // If the selected end date is before the current start date,
      // automatically adjust the start date to match the end date
      if (prev.startDate && date < prev.startDate) {
        newFilters.startDate = date;
      }
      
      return newFilters;
    });
  };

  return (
    <div className="flex flex-col gap-2 w-full md:w-auto">
      <label className="text-sm font-medium">Date Range</label>
      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !filters.startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.startDate ? format(filters.startDate, "PPP") : <span>Start date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.startDate}
              onSelect={handleStartDateSelect}
              disabled={(date) => {
                // Disable dates after the end date (if end date is selected)
                return filters.endDate ? date > filters.endDate : false;
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <span>to</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !filters.endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.endDate ? format(filters.endDate, "PPP") : <span>End date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.endDate}
              onSelect={handleEndDateSelect}
              disabled={(date) => {
                // Disable dates before the start date (if start date is selected)
                return filters.startDate ? date < filters.startDate : false;
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
