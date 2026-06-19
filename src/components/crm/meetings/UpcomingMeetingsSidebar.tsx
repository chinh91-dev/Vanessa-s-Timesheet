import React from "react";
import { useUpcomingMeetings } from "@/hooks/crm/useMeetings";
import { MEETING_TYPES } from "@/lib/crm/constants";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CRMMeeting, MeetingType } from "@/lib/crm/types";

// Safe accessor for meeting type info with fallback
const getMeetingTypeInfo = (type: string | null | undefined) => {
  const defaultInfo = { label: "Meeting", color: "hsl(var(--muted))" };
  if (!type || !(type in MEETING_TYPES)) return defaultInfo;
  return MEETING_TYPES[type as MeetingType];
};

interface UpcomingMeetingsSidebarProps {
  onMeetingClick: (meeting: CRMMeeting) => void;
}

const UpcomingMeetingsSidebar: React.FC<UpcomingMeetingsSidebarProps> = ({ onMeetingClick }) => {
  const { data: meetings = [], isLoading } = useUpcomingMeetings(10);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, d MMM");
  };

  const getContactName = (meeting: CRMMeeting) => {
    if (meeting.contact_name) return meeting.contact_name;
    if (meeting.lead?.contact_name) return meeting.lead.contact_name;
    if (meeting.account?.name) return meeting.account.name;
    return "Unknown";
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-4">Upcoming Meetings</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-4">Upcoming Meetings</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No upcoming meetings</p>
        </div>
      </div>
    );
  }

  // Group meetings by date
  const groupedMeetings = meetings.reduce<Record<string, CRMMeeting[]>>((acc, meeting) => {
    const dateKey = meeting.meeting_date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(meeting);
    return acc;
  }, {});

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Upcoming Meetings</h3>
      <div className="space-y-4">
        {Object.entries(groupedMeetings).map(([date, dateMeetings]) => (
          <div key={date}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {getDateLabel(date)}
            </div>
            <div className="space-y-2">
              {dateMeetings.map((meeting) => {
                const isCancelledOrNoShow = ["cancelled", "no_show"].includes(meeting.status);
                const displayColor = isCancelledOrNoShow 
                  ? "hsl(var(--muted-foreground))" 
                  : getMeetingTypeInfo(meeting.meeting_type).color;
                
                return (
                  <button
                    key={meeting.id}
                    onClick={() => onMeetingClick(meeting)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors",
                      isCancelledOrNoShow && "opacity-70"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: displayColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{meeting.title}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{meeting.start_time.slice(0, 5)}</span>
                          {meeting.end_time && <span>- {meeting.end_time.slice(0, 5)}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <User className="h-3 w-3" />
                          <span className="truncate">{getContactName(meeting)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        )}
                        style={{ backgroundColor: displayColor }}
                      >
                        {getMeetingTypeInfo(meeting.meeting_type).label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingMeetingsSidebar;
