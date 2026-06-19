import React from "react";
import { cn } from "@/lib/utils";
import { formatDateShort, isToday, isWeekend } from "@/lib/date-utils";
import { WeekDayStatus } from "@/hooks/useWeekValidation";

interface DayHeaderProps {
  date: Date;
  entries?: any[];
  userId?: string;
  // New: Pre-fetched day status from batch validation
  dayStatus?: WeekDayStatus;
  // Permissions passed from parent
  canCreateWeekendEntries?: boolean;
  canCreateHolidayEntries?: boolean;
  isAdmin?: boolean;
}

const DayHeader: React.FC<DayHeaderProps> = ({ 
  date, 
  entries = [], 
  userId,
  dayStatus,
  canCreateWeekendEntries = false,
  canCreateHolidayEntries = false,
  isAdmin = false,
}) => {
  // Use pre-fetched status or derive basic info
  const isWeekendDay = dayStatus?.isWeekend ?? isWeekend(date);
  const isHolidayDate = dayStatus?.isHoliday ?? false;
  const isOnLeave = dayStatus?.isOnLeave ?? false;
  const hasSpecificHolidayPermission = dayStatus?.hasSpecificHolidayPermission ?? false;
  
  // Derive blocked states
  const isWeekendBlocked = isWeekendDay && !canCreateWeekendEntries && !isAdmin;
  const isHolidayBlocked = isHolidayDate && !canCreateHolidayEntries && !isAdmin && !hasSpecificHolidayPermission;

  // Determine header color based on status
  const getHeaderColor = () => {
    if (isToday(date)) {
      return "bg-primary text-primary-foreground";
    }

    // Leave takes priority (teal)
    if (isOnLeave) {
      return "bg-teal-100 text-teal-800";
    }
    
    if (isHolidayBlocked) {
      return "bg-red-100 text-red-800";
    }
    
    if (isHolidayDate && !isHolidayBlocked) {
      return "bg-purple-100 text-purple-800";
    }
    
    if (isWeekendBlocked) {
      return "bg-red-100 text-red-800";
    }
    
    if (isWeekendDay) {
      return "bg-blue-100 text-blue-800";
    }
    
    return "bg-muted";
  };

  return (
    <div className={cn(
      "text-xs md:text-sm font-medium p-2 md:p-3 rounded-t-md relative overflow-hidden",
      getHeaderColor()
    )}>
      <div className="flex justify-between items-center">
        <span className="font-bold">{formatDateShort(date)}</span>
        <div className="flex items-center gap-1">
          {isToday(date) && (
            <span className="px-1.5 py-0.5 bg-white/20 text-white rounded-full text-[10px]">Today</span>
          )}

          {/* Leave badge - highest priority after Today */}
          {isOnLeave && (
            <span className="px-1.5 py-0.5 bg-teal-200 text-teal-800 rounded-full text-[10px]" title={dayStatus?.leaveType}>
              On Leave{dayStatus?.leaveType ? ` - ${dayStatus.leaveType}` : ''}
            </span>
          )}
          
          {isHolidayDate && !isOnLeave && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px]",
              isHolidayBlocked 
                ? "bg-red-200 text-red-800" 
                : "bg-purple-200 text-purple-800"
            )} title={dayStatus?.holidayName}>
              {isHolidayBlocked 
                ? "Holiday - Blocked" 
                : "Holiday - Allowed"}
            </span>
          )}
          
          {isWeekendDay && !isHolidayDate && !isOnLeave && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px]",
              isWeekendBlocked 
                ? "bg-red-200 text-red-800" 
                : "bg-blue-200 text-blue-800"
            )}>
              {isWeekendBlocked ? "Blocked" : "Weekend"}
            </span>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1">
        <div className="progress-indicator h-full w-0"></div>
      </div>
    </div>
  );
};

export default DayHeader;
