import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchLeaveApplications } from "@/lib/leave-service";
import { useToast } from "@/hooks/use-toast";
import { getMondayFirstDayOfWeek } from "@/lib/date-utils";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  userId: string;
  userName: string;
  leaveType: string;
  businessDays: number;
  reason?: string;
}

const TeamLeaveCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Fetch all approved leave applications
      const applications = await fetchLeaveApplications();
      
      // Filter and transform to calendar events
      const calendarEvents = applications
        .filter(app => 
          app.status === 'approved' &&
          new Date(app.start_date) <= endDate &&
          new Date(app.end_date) >= startDate
        )
        .map(app => ({
          id: app.id,
          title: `${app.user_full_name || 'Unknown'} - ${app.leave_type?.name || 'Leave'}`,
          start: app.start_date,
          end: app.end_date,
          userId: app.user_id,
          userName: app.user_full_name || 'Unknown User',
          leaveType: app.leave_type?.name || 'Leave',
          businessDays: app.business_days_count,
          reason: app.reason
        }));
      
      setEvents(calendarEvents);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load team leave calendar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = getMondayFirstDayOfWeek(firstDay); // Monday=0 system

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    
    const dateStr = date.toLocaleDateString('en-CA');
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const checkDate = new Date(dateStr);
      
      return checkDate >= eventStart && checkDate <= eventEnd;
    });
  };

  const getLeaveTypeColor = (leaveType: string) => {
    const colors = {
      'Annual Leave': 'bg-blue-100 text-blue-800',
      'Sick Leave': 'bg-red-100 text-red-800',
      'Personal Leave': 'bg-green-100 text-green-800',
      'Parental Leave': 'bg-purple-100 text-purple-800',
      'Study Leave': 'bg-yellow-100 text-yellow-800',
    };
    return colors[leaveType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Monday-first ordering

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Team Leave Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading calendar...</div>
          ) : (
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center font-medium text-muted-foreground text-sm">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {getDaysInMonth().map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const isToday = date && 
                    date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[80px] p-1 border border-border ${
                        !date ? 'bg-muted/30' : ''
                      } ${isToday ? 'bg-primary/5 border-primary/20' : ''}`}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium ${
                            isToday ? 'text-primary' : ''
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded cursor-pointer ${getLeaveTypeColor(event.leaveType)}`}
                                onClick={() => setSelectedEvent(event)}
                                title={`${event.userName} - ${event.leaveType}`}
                              >
                                <div className="truncate">
                                  {event.userName.split(' ')[0]}
                                </div>
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <div className="text-sm font-medium">Leave Types:</div>
                {['Annual Leave', 'Sick Leave', 'Personal Leave', 'Parental Leave'].map(type => (
                  <Badge key={type} className={getLeaveTypeColor(type)}>
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Monthly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-sm text-muted-foreground">Total Leave Applications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {events.reduce((sum, event) => sum + event.businessDays, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Business Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Set(events.map(event => event.userId)).size}
              </div>
              <div className="text-sm text-muted-foreground">Employees on Leave</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal (simplified) */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>Employee:</strong> {selectedEvent.userName}</div>
              <div><strong>Leave Type:</strong> {selectedEvent.leaveType}</div>
              <div><strong>Dates:</strong> {selectedEvent.start} to {selectedEvent.end}</div>
              <div><strong>Business Days:</strong> {selectedEvent.businessDays}</div>
              {selectedEvent.reason && (
                <div><strong>Reason:</strong> {selectedEvent.reason}</div>
              )}
            </div>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamLeaveCalendar;