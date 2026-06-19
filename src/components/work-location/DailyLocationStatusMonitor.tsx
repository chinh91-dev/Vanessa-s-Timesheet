import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, RefreshCw, Users, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { 
  getDailyLocationStatusSummary,
  getLocationDisplayName,
  getLocationColor,
  type DailyLocationStatusSummary 
} from "@/lib/daily-location-service";

const DailyLocationStatusMonitor = () => {
  const { userRole } = useAuth();

  // Only admins can see this component - check BEFORE any other hooks
  if (userRole !== 'admin') {
    return null;
  }

  const [statusData, setStatusData] = useState<DailyLocationStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const loadStatusData = async (date: Date = selectedDate) => {
    setLoading(true);
    try {
      const dateString = date.toLocaleDateString('en-CA', {
        timeZone: 'Australia/Melbourne'
      });
      const data = await getDailyLocationStatusSummary(dateString);
      setStatusData(data);
    } catch (error) {
      console.error('Error loading status data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusData(selectedDate);
  }, [selectedDate]);

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-AU', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Australia/Melbourne'
      });
    } catch {
      return timeString;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    const australianToday = new Date(today.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
    const selectedAustralian = new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
    
    return australianToday.toDateString() === selectedAustralian.toDateString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Daily Location Status
            {isToday(selectedDate) && (
              <Badge variant="secondary" className="ml-2">
                Today
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Date Picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("2023-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStatusData()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : statusData ? (
          <div className="space-y-6">
            {/* WHO IS WHERE — grouped by location */}
            {statusData.confirmed.length > 0 && (
              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Who is Where Today
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { loc: 'collins_square', label: 'Collins Square', bg: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', count: 'text-purple-800 dark:text-purple-200' },
                    { loc: 'wfh', label: 'WFH', bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', count: 'text-green-800 dark:text-green-200' },
                    { loc: 'client', label: 'Client Site', bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', count: 'text-orange-800 dark:text-orange-200' },
                  ].map(({ loc, label, bg, border, text, count }) => {
                    const people = statusData.confirmed.filter(u => u.actual_location === loc);
                    return (
                      <div key={loc} className={`rounded-lg p-3 ${bg} border ${border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-semibold text-sm ${text}`}>{label}</span>
                          <span className={`text-2xl font-bold ${count}`}>{people.length}</span>
                        </div>
                        <div className="space-y-1">
                          {people.length === 0 ? (
                            <p className={`text-xs italic ${text} opacity-60`}>Nobody here yet</p>
                          ) : (
                            people.map(u => (
                              <div key={u.id} className={`text-xs font-medium ${text}`}>
                                {u.full_name}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {statusData.confirmed.length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Confirmed</div>
              </div>

              <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {statusData.notConfirmed.length}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Not Confirmed</div>
              </div>

              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {statusData.noSchedule.length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">No Schedule</div>
              </div>
            </div>

            {/* Detailed Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Confirmed */}
              <div className="space-y-3">
                <h3 className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Confirmed ({statusData.confirmed.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statusData.confirmed.map((user) => (
                    <div key={user.id} className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <div className="font-medium text-sm">{user.full_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getLocationColor(user.actual_location)} variant="outline">
                          {getLocationDisplayName(user.actual_location)}
                        </Badge>
                        {user.location_changed && (
                          <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                            Changed
                          </Badge>
                        )}
                        {user.late_checkin && (
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                            Late
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(user.check_in_time)}
                      </div>
                    </div>
                  ))}
                  {statusData.confirmed.length === 0 && (
                    <div className="text-sm text-muted-foreground italic p-3">
                      No confirmed check-ins
                    </div>
                  )}
                </div>
              </div>

              {/* Not Confirmed */}
              <div className="space-y-3">
                <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Not Confirmed ({statusData.notConfirmed.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statusData.notConfirmed.map((user) => (
                    <div key={user.id} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                      <div className="font-medium text-sm">{user.full_name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                      <div className="mt-1">
                        <Badge className={getLocationColor(user.planned_location)} variant="outline">
                          Expected: {getLocationDisplayName(user.planned_location)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {statusData.notConfirmed.length === 0 && (
                    <div className="text-sm text-muted-foreground italic p-3">
                      All scheduled users confirmed
                    </div>
                  )}
                </div>
              </div>

              {/* No Schedule */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  No Schedule ({statusData.noSchedule.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statusData.noSchedule.map((user) => (
                    <div key={user.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="font-medium text-sm">{user.full_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Not scheduled to work
                      </div>
                    </div>
                  ))}
                  {statusData.noSchedule.length === 0 && (
                    <div className="text-sm text-muted-foreground italic p-3">
                      All users have schedules
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Failed to load status data. Please try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyLocationStatusMonitor;
