import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Clock, User, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { useMeetingsByMonth } from "@/hooks/crm/useMeetings";
import { MEETING_TYPES } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";
import type { MeetingType, CRMMeeting } from "@/lib/crm/types";

// Safe accessor for meeting type info with fallback
const getMeetingTypeInfo = (type: string | null | undefined) => {
  const defaultInfo = { label: "Meeting", color: "hsl(var(--muted))" };
  if (!type || !(type in MEETING_TYPES)) return defaultInfo;
  return MEETING_TYPES[type as MeetingType];
};

const getContactName = (meeting: CRMMeeting) => {
  if (meeting.contact_name) return meeting.contact_name;
  if (meeting.lead?.contact_name) return meeting.lead.contact_name;
  if (meeting.account?.name) return meeting.account.name;
  return null;
};

interface MeetingCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  typeFilter: MeetingType | "all";
  onMeetingClick: (meeting: CRMMeeting) => void;
  onDayClick?: (date: Date) => void;
}

const MeetingCalendar: React.FC<MeetingCalendarProps> = ({
  currentDate,
  onDateChange,
  typeFilter,
  onMeetingClick,
  onDayClick,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: meetings = [], isLoading } = useMeetingsByMonth(year, month);

  const filteredMeetings = typeFilter === "all"
    ? meetings
    : meetings.filter(m => m.meeting_type === typeFilter);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Days in month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to align with week
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(daysInMonth);

  const getMeetingsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return filteredMeetings.filter(m => m.meeting_date === dateStr);
  };

  // For mobile list: days that have meetings, sorted by date
  const daysWithMeetings = daysInMonth
    .map(day => ({
      day,
      dayMeetings: getMeetingsForDay(day).sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      ),
    }))
    .filter(({ dayMeetings }) => dayMeetings.length > 0);

  const weekDays = [
    { short: "S", long: "Sun" },
    { short: "M", long: "Mon" },
    { short: "T", long: "Tue" },
    { short: "W", long: "Wed" },
    { short: "T", long: "Thu" },
    { short: "F", long: "Fri" },
    { short: "S", long: "Sat" },
  ];

  return (
    <div className="bg-card rounded-lg border">
      {/* Month navigation — always visible */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* ── Mobile list view ── */}
      <div className="sm:hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-14 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : daysWithMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <CalendarDays className="h-10 w-10 opacity-40" />
            <p className="text-sm">No meetings this month</p>
            <p className="text-xs opacity-60">Tap a day on the calendar to add one</p>
          </div>
        ) : (
          <div className="divide-y">
            {daysWithMeetings.map(({ day, dayMeetings }) => {
              const isTodayDate = isToday(day);
              return (
                <div key={day.toISOString()}>
                  {/* Date header */}
                  <button
                    onClick={() => onDayClick?.(day)}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-muted/50 transition-colors",
                      isTodayDate && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      isTodayDate
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      isTodayDate ? "text-primary" : "text-muted-foreground"
                    )}>
                      {isTodayDate ? "Today" : format(day, "EEEE, d MMM")}
                    </span>
                  </button>

                  {/* Meetings for this day */}
                  <div className="px-4 pb-2 space-y-2">
                    {dayMeetings.map(meeting => {
                      const isCancelledOrNoShow = ["cancelled", "no_show"].includes(meeting.status);
                      const typeInfo = getMeetingTypeInfo(meeting.meeting_type);
                      const color = isCancelledOrNoShow
                        ? "hsl(var(--muted-foreground))"
                        : typeInfo.color;
                      const contactName = getContactName(meeting);

                      return (
                        <button
                          key={meeting.id}
                          onClick={() => onMeetingClick(meeting)}
                          className={cn(
                            "w-full text-left rounded-lg border bg-card hover:bg-accent transition-colors overflow-hidden",
                            isCancelledOrNoShow && "opacity-60"
                          )}
                        >
                          <div className="flex">
                            {/* Colored left bar */}
                            <div className="w-1 shrink-0 rounded-l-lg" style={{ backgroundColor: color }} />
                            <div className="flex-1 px-3 py-2.5">
                              <p className="font-medium text-sm leading-tight">{meeting.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {meeting.start_time.slice(0, 5)}
                                  {meeting.end_time && ` – ${meeting.end_time.slice(0, 5)}`}
                                </span>
                                {contactName && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                    <User className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{contactName}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Type badge */}
                            <div className="flex items-center pr-3">
                              <span
                                className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: color }}
                              >
                                {typeInfo.label}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Desktop calendar grid ── */}
      <div className="hidden sm:block">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day, i) => (
            <div key={i} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day.long}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {paddedDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-[140px] border-b border-r bg-muted/30" />;
            }

            const dayMeetings = getMeetingsForDay(day).sort((a, b) =>
              a.start_time.localeCompare(b.start_time)
            );
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const extraCount = dayMeetings.length - 3;

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick?.(day)}
                className={cn(
                  "h-[140px] border-b border-r p-1 transition-colors cursor-pointer hover:bg-muted/50 flex flex-col overflow-hidden",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                  isTodayDate && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-sm font-medium p-1 rounded-full w-7 h-7 flex items-center justify-center shrink-0",
                  isTodayDate && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </div>

                <div className="space-y-1 mt-1 flex-1 min-h-0 overflow-hidden">
                  {dayMeetings.slice(0, 3).map((meeting) => {
                    const isCancelledOrNoShow = ["cancelled", "no_show"].includes(meeting.status);
                    return (
                      <button
                        key={meeting.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMeetingClick(meeting);
                        }}
                        className={cn(
                          "w-full text-left text-xs p-1 rounded truncate transition-opacity hover:opacity-80",
                          "text-white font-medium",
                          isCancelledOrNoShow && "opacity-70"
                        )}
                        style={{
                          backgroundColor: isCancelledOrNoShow
                            ? "hsl(var(--muted-foreground))"
                            : getMeetingTypeInfo(meeting.meeting_type).color
                        }}
                      >
                        {meeting.start_time.slice(0, 5)} {meeting.title}
                      </button>
                    );
                  })}
                  {extraCount > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-left text-xs px-1 py-0.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                        >
                          +{extraCount} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-72 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2 border-b">
                          <p className="text-sm font-semibold">{format(day, "EEEE, d MMM yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayMeetings.length} meeting{dayMeetings.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                          {dayMeetings.map((meeting) => {
                            const isCancelledOrNoShow = ["cancelled", "no_show"].includes(meeting.status);
                            return (
                              <button
                                key={meeting.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMeetingClick(meeting);
                                }}
                                className={cn(
                                  "w-full text-left text-xs p-2 rounded transition-opacity hover:opacity-80 text-white font-medium",
                                  isCancelledOrNoShow && "opacity-70"
                                )}
                                style={{
                                  backgroundColor: isCancelledOrNoShow
                                    ? "hsl(var(--muted-foreground))"
                                    : getMeetingTypeInfo(meeting.meeting_type).color
                                }}
                              >
                                <div className="truncate">
                                  {meeting.start_time.slice(0, 5)} {meeting.title}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingCalendar;
