import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, ChevronLeft, ChevronRight, Plus, Calendar, Clock, FileText, User, Edit, Save, X, Trash2 } from "lucide-react";
import { getWorkLocationCalendarEvents, getLocationColor, type WorkLocationCalendarEvent } from "@/lib/work-location-service";
import { getLocationDisplayName, getAllTodayCheckins, updateDailyCheckin, createDailyCheckin, getDailyLocationStatus, deleteDailyCheckin } from "@/lib/daily-location-service";
import { deleteWeeklyWorkSchedule } from "@/lib/weekly-work-schedule-service";
import { getMondayFirstDayOfWeek, toLocalYMD } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import MultiLocationEntryDialog from "./MultiLocationEntryDialog";
import MultiDayLocationEntryDialog from "./MultiDayLocationEntryDialog";

// Utility function to format time ranges in AEST
const formatTimeRange = (startTime?: string, endTime?: string): string => {
  if (!startTime) return '';
  
  const formatTime = (timeStr: string) => {
    const time = new Date(timeStr);
    return time.toLocaleTimeString('en-AU', { 
      timeZone: 'Australia/Melbourne',
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  const start = formatTime(startTime);
  if (endTime) {
    const end = formatTime(endTime);
    return `${start} - ${end}`;
  }
  return start;
};

interface WorkLocationCalendarProps {
  onAddLocation?: (date: string) => void;
  selectedUsers: string[];
  onUsersChange: (userIds: string[]) => void;
}

interface EditedEventData extends Partial<WorkLocationCalendarEvent> {
  customLocation?: string;
}

const WorkLocationCalendar: React.FC<WorkLocationCalendarProps> = ({
  onAddLocation,
  selectedUsers,
  onUsersChange
}) => {
  const [events, setEvents] = useState<WorkLocationCalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<WorkLocationCalendarEvent[]>([]);
  const [dailyCheckins, setDailyCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<WorkLocationCalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedEvent, setEditedEvent] = useState<EditedEventData>({});
  const [selectedDateForEntry, setSelectedDateForEntry] = useState<string>('');
  const [plannedLocationForEntry, setPlannedLocationForEntry] = useState<string>('');
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [showMultiDayDialog, setShowMultiDayDialog] = useState(false);
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  useEffect(() => {
    // Filter events based on selected users
    if (selectedUsers.length > 0) {
      // Show only selected users' events
      setEvents(allEvents.filter(event => selectedUsers.includes(event.user_id)));
    } else {
      // Show no events when no users are selected (None button clicked)
      setEvents([]);
    }
  }, [allEvents, selectedUsers]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const startDateStr = toLocalYMD(startDate);
      const endDateStr = toLocalYMD(endDate);
      
      // Load calendar events and daily checkins
      console.log(`📅 Loading calendar data for ${startDateStr} to ${endDateStr}`);
      const [calendarEvents, todayCheckins] = await Promise.all([
        getWorkLocationCalendarEvents(startDateStr, endDateStr),
        getAllTodayCheckins()
      ]);
      
      console.log(`✅ Loaded ${calendarEvents.length} calendar events and ${todayCheckins.length} today's check-ins`);
      
      setAllEvents(calendarEvents);
      setDailyCheckins(todayCheckins);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load work location calendar.",
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
    
    // Convert Sunday=0 to Monday=0 system for calendar grid using standardized utility
    const mondayFirstStartingDay = getMondayFirstDayOfWeek(firstDay);

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < mondayFirstStartingDay; i++) {
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
    
    const dateStr = toLocalYMD(date);
    return events.filter(event => event.date === dateStr);
  };

  const handleDayClick = async (date: Date | null) => {
    if (!date || !user) return;
    
    const dateStr = toLocalYMD(date);
    setSelectedDateForEntry(dateStr);
    
    // Get planned location for this user and date
    try {
      const status = await getDailyLocationStatus(user.id, dateStr);
      setPlannedLocationForEntry(status?.planned_location || '');
    } catch (error) {
      console.log('No planned location found for this date');
      setPlannedLocationForEntry('');
    }
    
    setShowEntryDialog(true);
  };

  const locationOptions = [
    { value: 'collins_square', label: 'Collins Square' },
    { value: 'wfh', label: 'WFH' },
    { value: 'client', label: 'Client Site' },
    { value: 'custom', label: 'Custom Location' },
  ];

  const handleSaveEdit = async () => {
    if (!selectedEvent || !editedEvent) return;

    try {
      const finalLocation = editedEvent.location === 'custom' 
        ? `custom:${editedEvent.customLocation?.trim()}` 
        : editedEvent.location || selectedEvent.location;

      // Handle different entry types based on ID prefix
      if (selectedEvent.id.startsWith('default-')) {
        // Default entries are virtual - create a new daily check-in instead
        await createDailyCheckin(
          selectedEvent.user_id,
          selectedEvent.date,
          finalLocation,
          selectedEvent.location, // planned location from default schedule
          undefined, // no location change reason
          editedEvent.notes,
          editedEvent.start_time,
          editedEvent.end_time
        );
        
        toast({
          title: "Success",
          description: "Location entry created successfully.",
        });
      } else if (selectedEvent.id.startsWith('daily-')) {
        // Daily entries - strip prefix and update the real record
        const realId = selectedEvent.id.replace('daily-', '');
        await updateDailyCheckin(
          realId,
          finalLocation,
          undefined,
          editedEvent.notes,
          editedEvent.start_time,
          editedEvent.end_time,
          selectedEvent.date
        );
        
        toast({
          title: "Success",
          description: "Location updated successfully.",
        });
      } else if (selectedEvent.id.startsWith('weekly-')) {
        // Weekly entries - create a daily check-in to override for this specific day
        await createDailyCheckin(
          selectedEvent.user_id,
          selectedEvent.date,
          finalLocation,
          selectedEvent.location, // planned location from weekly schedule
          undefined,
          editedEvent.notes,
          editedEvent.start_time,
          editedEvent.end_time
        );
        
        toast({
          title: "Success",
          description: "Location entry created successfully.",
        });
      } else {
        // Fallback - try to update as-is (legacy behavior)
        await updateDailyCheckin(
          selectedEvent.id,
          finalLocation,
          undefined,
          editedEvent.notes,
          editedEvent.start_time,
          editedEvent.end_time,
          selectedEvent.date
        );
        
        toast({
          title: "Success",
          description: "Location updated successfully.",
        });
      }

      setEditMode(false);
      setShowEventDialog(false);
      loadCalendarData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (selectedEvent) {
      setEditedEvent({
        location: selectedEvent.location.includes('custom:') ? 'custom' : selectedEvent.location,
        customLocation: selectedEvent.location.includes('custom:') ? selectedEvent.location.replace('custom:', '') : '',
        start_time: selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleTimeString('en-AU', { 
          timeZone: 'Australia/Melbourne',
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '',
        end_time: selectedEvent.end_time ? new Date(selectedEvent.end_time).toLocaleTimeString('en-AU', { 
          timeZone: 'Australia/Melbourne',
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '',
        notes: selectedEvent.notes || ''
      });
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEvent || userRole !== 'admin') return;

    try {
      if (selectedEvent.id.startsWith('daily-')) {
        // Delete daily check-in entry
        const checkinId = selectedEvent.id.replace('daily-', '');
        await deleteDailyCheckin(checkinId);
      } else if (selectedEvent.id.startsWith('weekly-')) {
        // Delete weekly schedule entry
        const weekStartDate = new Date(selectedEvent.date);
        // Find the Monday of this week
        const dayOfWeek = weekStartDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStartDate.setDate(weekStartDate.getDate() + mondayOffset);
        
        await deleteWeeklyWorkSchedule(selectedEvent.user_id, weekStartDate);
      } else if (selectedEvent.id.startsWith('default-')) {
        // For default entries, we can't delete them as they come from user profiles
        toast({
          title: "Cannot Delete",
          description: "Default schedule entries cannot be deleted. Please modify the user's work schedule instead.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Location entry deleted successfully.",
      });

      setShowEventDialog(false);
      loadCalendarData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location entry.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const groupEventsByUser = (dayEvents: WorkLocationCalendarEvent[]) => {
    const grouped = dayEvents.reduce((acc, event) => {
      if (!acc[event.user_id]) {
        acc[event.user_id] = [];
      }
      acc[event.user_id].push(event);
      return acc;
    }, {} as Record<string, WorkLocationCalendarEvent[]>);

    return grouped;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const locationStats = events.reduce((acc, event) => {
    acc[event.location] = (acc[event.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Main Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Team Work Location Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMultiDayDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Multi-Day Location
              </Button>
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
                  const groupedEvents = groupEventsByUser(dayEvents);
                  // Check if it's today in AEST timezone
                  const isToday = date && 
                    date.toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' }) === 
                    new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });
                  
                  return (
                     <div
                      key={index}
                      className={`min-h-[200px] p-2 border border-border cursor-pointer hover:bg-muted/30 transition-colors ${
                        !date ? 'bg-muted/30' : ''
                      } ${isToday ? 'bg-primary/5 border-primary/20' : ''}`}
                      onClick={() => handleDayClick(date)}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-3 flex items-center justify-between ${
                            isToday ? 'text-primary' : ''
                          }`}>
                            <span>{date.getDate()}</span>
                            <Plus className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                          </div>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto">
                            {Object.entries(groupedEvents).map(([userId, userEvents]) => {
                              const firstEvent = userEvents[0];
                              return (
                                <div key={userId} className="space-y-1">
                                  {/* User header */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <Avatar className="w-5 h-5">
                                      <AvatarFallback className="text-[8px]">
                                        {getInitials(firstEvent.user_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="text-[10px] font-medium text-muted-foreground truncate">
                                      {firstEvent.user_name.split(' ')[0]}
                                    </div>
                                    {userEvents.length > 1 && (
                                      <Badge variant="secondary" className="text-[8px] h-4 px-1">
                                        {userEvents.length}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Location entries */}
                                  {userEvents.map((event, eventIndex) => (
                                    <div
                                      key={event.id}
                                      className={`text-xs p-1.5 rounded cursor-pointer border ml-7 ${getLocationColor(event.location)} hover:opacity-80 transition-opacity`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEvent(event);
                                        setEditedEvent({
                                          location: event.location.includes('custom:') ? 'custom' : event.location,
                                          customLocation: event.location.includes('custom:') ? event.location.replace('custom:', '') : '',
                                          start_time: event.start_time ? new Date(event.start_time).toLocaleTimeString('en-AU', { 
                                            timeZone: 'Australia/Melbourne',
                                            hour12: false, 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          }) : '',
                                          end_time: event.end_time ? new Date(event.end_time).toLocaleTimeString('en-AU', { 
                                            timeZone: 'Australia/Melbourne',
                                            hour12: false, 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          }) : '',
                                          notes: event.notes || ''
                                        });
                                        setEditMode(false);
                                        setShowEventDialog(true);
                                      }}
                                      title={`${event.user_name} - ${getLocationDisplayName(event.location)}`}
                                    >
                                       <div className="flex items-center gap-1">
                                         <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></div>
                                         <div className="truncate text-[10px]">
                                           {getLocationDisplayName(event.location)}
                                         </div>
                                       </div>
                                       {(event.start_time || event.end_time) && (
                                         <div className="truncate text-[9px] opacity-60 mt-1">
                                           {formatTimeRange(event.start_time, event.end_time)}
                                         </div>
                                       )}
                                       {event.notes && (
                                         <div className="truncate text-[9px] opacity-60 mt-1">
                                           {event.notes}
                                         </div>
                                       )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                   );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <div className="text-sm font-medium">Location Types:</div>
                {['collins_square', 'wfh', 'client'].map(type => (
                  <Badge key={type} className={getLocationColor(type)}>
                    {getLocationDisplayName(type)}
                  </Badge>
                ))}
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                  Custom Locations
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Location Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </div>
              {!editMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Employee:</span>
                <span>{selectedEvent.user_name}</span>
              </div>
              
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{new Date(selectedEvent.date).toLocaleDateString('en-AU')}</span>
              </div>
              
              {!editMode ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <Badge className={getLocationColor(selectedEvent.location)}>
                      {getLocationDisplayName(selectedEvent.location)}
                    </Badge>
                  </div>
                  
                  {(selectedEvent.start_time || selectedEvent.end_time) && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Time:</span>
                      <span>{formatTimeRange(selectedEvent.start_time, selectedEvent.end_time)}</span>
                    </div>
                  )}
                  
                  {selectedEvent.notes && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Notes:</span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                        {selectedEvent.notes}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Select
                      value={editedEvent.location || ''}
                      onValueChange={(value) => setEditedEvent({...editedEvent, location: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editedEvent.location === 'custom' && (
                    <div className="space-y-2">
                      <Label>Custom Location *</Label>
                      <Input
                        value={editedEvent.customLocation || ''}
                        onChange={(e) => setEditedEvent({...editedEvent, customLocation: e.target.value})}
                        placeholder="Enter custom location name..."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={editedEvent.start_time || ''}
                        onChange={(e) => setEditedEvent({...editedEvent, start_time: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={editedEvent.end_time || ''}
                        onChange={(e) => setEditedEvent({...editedEvent, end_time: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editedEvent.notes || ''}
                      onChange={(e) => setEditedEvent({...editedEvent, notes: e.target.value})}
                      placeholder="Optional notes..."
                      rows={3}
                    />
                  </div>
                </>
              )}
              
              <div className="flex justify-between pt-4">
                {/* Delete button - only show for admins */}
                <div>
                  {!editMode && userRole === 'admin' && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteEntry}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Entry
                    </Button>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEdit}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEventDialog(false)}
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-Location Entry Dialog */}
      <MultiLocationEntryDialog
        open={showEntryDialog}
        onOpenChange={setShowEntryDialog}
        selectedDate={selectedDateForEntry}
        plannedLocation={plannedLocationForEntry}
        onSuccess={() => {
          loadCalendarData();
          setShowEntryDialog(false);
        }}
      />

      {/* Multi-Day Location Entry Dialog */}
      <MultiDayLocationEntryDialog
        open={showMultiDayDialog}
        onOpenChange={setShowMultiDayDialog}
        onSuccess={() => {
          loadCalendarData();
          setShowMultiDayDialog(false);
        }}
      />
    </div>
  );
};

export default WorkLocationCalendar;