import { DateRange, DateRangePreset } from "@/lib/date-range-utils";

export interface DateRangeType {
  from: Date;
  to: Date;
}

// Get Australian Financial Year (July 1 - June 30)
export const getCurrentAustralianFY = (): DateRangeType => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = January, 6 = July)
  
  // If before July (month 6), we're in the previous FY
  const fyStartYear = currentMonth < 6 ? currentYear - 1 : currentYear;
  
  return {
    from: new Date(fyStartYear, 6, 1), // July 1
    to: new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999) // June 30 next year
  };
};

export const getPreviousAustralianFY = (): DateRangeType => {
  const currentFY = getCurrentAustralianFY();
  const startYear = currentFY.from.getFullYear();
  
  return {
    from: new Date(startYear - 1, 6, 1),
    to: new Date(startYear, 5, 30, 23, 59, 59, 999)
  };
};

export const getAustralianFY = (yearsAgo: number): DateRangeType => {
  const currentFY = getCurrentAustralianFY();
  const startYear = currentFY.from.getFullYear() - yearsAgo;
  
  return {
    from: new Date(startYear, 6, 1),
    to: new Date(startYear + 1, 5, 30, 23, 59, 59, 999)
  };
};

// Get Australian FY Quarter (Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun)
export const getAustralianFYQuarter = (fy: DateRangeType, quarter: 1 | 2 | 3 | 4): DateRangeType => {
  const startYear = fy.from.getFullYear();
  
  switch (quarter) {
    case 1: // Jul-Sep
      return {
        from: new Date(startYear, 6, 1),
        to: new Date(startYear, 8, 30, 23, 59, 59, 999)
      };
    case 2: // Oct-Dec
      return {
        from: new Date(startYear, 9, 1),
        to: new Date(startYear, 11, 31, 23, 59, 59, 999)
      };
    case 3: // Jan-Mar
      return {
        from: new Date(startYear + 1, 0, 1),
        to: new Date(startYear + 1, 2, 31, 23, 59, 59, 999)
      };
    case 4: // Apr-Jun
      return {
        from: new Date(startYear + 1, 3, 1),
        to: new Date(startYear + 1, 5, 30, 23, 59, 59, 999)
      };
  }
};

export const getAustralianFYLabel = (startDate: Date): string => {
  const startYear = startDate.getFullYear();
  const endYear = startYear + 1;
  return `FY ${startYear}/${endYear.toString().slice(2)}`;
};

export const getAustralianFYLongLabel = (startDate: Date): string => {
  const startYear = startDate.getFullYear();
  const endYear = startYear + 1;
  return `FY ${startYear}/${endYear} (Jul ${startYear} - Jun ${endYear})`;
};

export const australianFYPresets: DateRangePreset[] = [
  {
    label: "This Financial Year",
    value: "this_fy",
    range: getCurrentAustralianFY
  },
  {
    label: "Last Financial Year",
    value: "last_fy",
    range: getPreviousAustralianFY
  },
  {
    label: "FY 2 Years Ago",
    value: "fy_2_years",
    range: () => getAustralianFY(2)
  },
  {
    label: "FY 3 Years Ago",
    value: "fy_3_years",
    range: () => getAustralianFY(3)
  }
];

export const getFYKey = (fy: DateRangeType): string => {
  const startYear = fy.from.getFullYear();
  return `fy_${startYear}_${startYear + 1}`;
};

export const getFYFromKey = (key: string): DateRangeType => {
  const match = key.match(/fy_(\d{4})_(\d{4})/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    return {
      from: new Date(startYear, 6, 1),
      to: new Date(startYear + 1, 5, 30, 23, 59, 59, 999)
    };
  }
  return getCurrentAustralianFY();
};

// Get date range for a specific month
export const getMonthRange = (monthIndex: number, year: number): DateRangeType => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: new Date(year, monthIndex, 1),
    to: new Date(year, monthIndex, lastDay, 23, 59, 59, 999)
  };
};

// Get months for a financial year in FY order (Jul-Jun)
export const getMonthsForFY = (fy: DateRangeType): { monthIndex: number; year: number; label: string }[] => {
  const startYear = fy.from.getFullYear();
  const months = [
    { monthIndex: 6, year: startYear, label: 'Jul' },
    { monthIndex: 7, year: startYear, label: 'Aug' },
    { monthIndex: 8, year: startYear, label: 'Sep' },
    { monthIndex: 9, year: startYear, label: 'Oct' },
    { monthIndex: 10, year: startYear, label: 'Nov' },
    { monthIndex: 11, year: startYear, label: 'Dec' },
    { monthIndex: 0, year: startYear + 1, label: 'Jan' },
    { monthIndex: 1, year: startYear + 1, label: 'Feb' },
    { monthIndex: 2, year: startYear + 1, label: 'Mar' },
    { monthIndex: 3, year: startYear + 1, label: 'Apr' },
    { monthIndex: 4, year: startYear + 1, label: 'May' },
    { monthIndex: 5, year: startYear + 1, label: 'Jun' },
  ];
  return months;
};

// Check if a date range matches a specific month
export const isMonthSelected = (value: DateRangeType, monthIndex: number, year: number): boolean => {
  const monthRange = getMonthRange(monthIndex, year);
  return value.from.getTime() === monthRange.from.getTime() && 
         value.to.getTime() === monthRange.to.getTime();
};
