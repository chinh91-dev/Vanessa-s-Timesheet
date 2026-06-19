import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DateRangeType,
  getCurrentAustralianFY,
  getAustralianFY,
  getAustralianFYLabel,
  getAustralianFYQuarter,
  getFYKey,
  getFYFromKey,
  getMonthRange,
  getMonthsForFY,
  isMonthSelected,
} from "@/lib/crm/financial-year-utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FinancialYearSelectorProps {
  value: DateRangeType;
  onChange: (fy: DateRangeType) => void;
}

export const FinancialYearSelector = ({
  value,
  onChange,
}: FinancialYearSelectorProps) => {
  const [baseFY, setBaseFY] = useState<DateRangeType>(getCurrentAustralianFY());
  const currentFY = getCurrentAustralianFY();
  const fyKey = getFYKey(baseFY);
  const months = getMonthsForFY(baseFY);

  const handleQuarterClick = (quarter: 1 | 2 | 3 | 4) => {
    onChange(getAustralianFYQuarter(baseFY, quarter));
  };

  const handleFYChange = (key: string) => {
    const newFY = getFYFromKey(key);
    setBaseFY(newFY);
    onChange(newFY);
  };

  const handleMonthClick = (monthIndex: number, year: number) => {
    onChange(getMonthRange(monthIndex, year));
  };

  const handleFullFY = () => {
    onChange(baseFY);
  };

  const handleCustomFromDate = (date: Date | undefined) => {
    if (date) {
      onChange({
        from: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        to: value.to
      });
    }
  };

  const handleCustomToDate = (date: Date | undefined) => {
    if (date) {
      const lastMoment = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      onChange({
        from: value.from,
        to: lastMoment
      });
    }
  };

  // Check if current value matches the full FY
  const isFullFYSelected = value.from.getTime() === baseFY.from.getTime() && 
                           value.to.getTime() === baseFY.to.getTime();

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Date Range Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Financial Year and Quarters */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <Select value={fyKey} onValueChange={handleFYChange}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select Financial Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={getFYKey(currentFY)}>
                {getAustralianFYLabel(currentFY.from)} (Current)
              </SelectItem>
              <SelectItem value={getFYKey(getAustralianFY(1))}>
                {getAustralianFYLabel(getAustralianFY(1).from)}
              </SelectItem>
              <SelectItem value={getFYKey(getAustralianFY(2))}>
                {getAustralianFYLabel(getAustralianFY(2).from)}
              </SelectItem>
              <SelectItem value={getFYKey(getAustralianFY(3))}>
                {getAustralianFYLabel(getAustralianFY(3).from)}
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={isFullFYSelected ? "default" : "outline"}
              onClick={handleFullFY}
            >
              Full FY
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuarterClick(1)}
            >
              Q1
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuarterClick(2)}
            >
              Q2
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuarterClick(3)}
            >
              Q3
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuarterClick(4)}
            >
              Q4
            </Button>
          </div>
        </div>

        {/* Row 2: Month Quick Select */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Monthly:</p>
          <div className="flex gap-1 flex-wrap">
            {months.map((month) => {
              const selected = isMonthSelected(value, month.monthIndex, month.year);
              return (
                <Button
                  key={`${month.monthIndex}-${month.year}`}
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  className="px-2 py-1 h-7 text-xs"
                  onClick={() => handleMonthClick(month.monthIndex, month.year)}
                >
                  {month.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Custom Date Range */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Custom Range:</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-left font-normal",
                    !value.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(value.from, "d MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value.from}
                  onSelect={handleCustomFromDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-muted-foreground">to</span>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-left font-normal",
                    !value.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(value.to, "d MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value.to}
                  onSelect={handleCustomToDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Displaying */}
        <div className="text-sm text-muted-foreground border-t pt-3">
          <p className="font-medium">
            Displaying: {format(value.from, "d MMM yyyy")} -{" "}
            {format(value.to, "d MMM yyyy")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
