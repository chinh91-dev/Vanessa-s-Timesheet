import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Save, X, CalendarDays, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { createDailyCheckin } from "@/lib/daily-location-service";
import { upsertWeeklyWorkSchedule } from "@/lib/weekly-work-schedule-service";
import { format, addDays, isSameWeek, getDay } from "date-fns";
import { getWeekStart, toLocalYMD } from "@/lib/date-utils";

interface MultiDayLocationEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const MultiDayLocationEntryDialog: React.FC<MultiDayLocationEntryDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const locationOptions = [
    { value: 'collins_square', label: 'Collins Square' },
    { value: 'wfh', label: 'WFH' },
    { value: 'client', label: 'Client Site' },
    { value: 'custom', label: 'Custom Location' },
  ];

  const getDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    let currentDate = start;
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  };

  const getDayName = (date: Date) => {
    return format(date, 'EEE');
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!location || (location === 'custom' && !customLocation.trim())) {
      toast({
        title: "Error",
        description: "Please select a location.",
        variant: "destructive",
      });
      return;
    }

    if (!isFullDay && (!startTime || !endTime)) {
      toast({
        title: "Error",
        description: "Please specify start and end times.",
        variant: "destructive",
      });
      return;
    }

    if (!isFullDay && startTime >= endTime) {
      toast({
        title: "Error",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const finalLocation = location === 'custom' 
        ? `custom:${customLocation.trim()}` 
        : location;

      const dates = getDateRange();
      
      if (isFullDay) {
        // For full day entries, create weekly schedule entries by week
        const weekGroups = new Map<string, Date[]>();
        
        dates.forEach(date => {
          const weekStart = getWeekStart(date);
          const weekKey = toLocalYMD(weekStart);
          
          if (!weekGroups.has(weekKey)) {
            weekGroups.set(weekKey, []);
          }
          weekGroups.get(weekKey)!.push(date);
        });

        // Create weekly schedule entries for each week
        for (const [weekKey, weekDates] of weekGroups.entries()) {
          const locationData: any = {};
          
          weekDates.forEach(date => {
            const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
            const dayNames = [
              'sunday_location',
              'monday_location', 
              'tuesday_location',
              'wednesday_location',
              'thursday_location',
              'friday_location',
              'saturday_location'
            ];
            
            locationData[dayNames[dayOfWeek]] = finalLocation;
          });

          await upsertWeeklyWorkSchedule(user.id, new Date(weekKey), {
            ...locationData,
            notes: notes || undefined
          });
        }
      } else {
        // For timed entries, create individual daily check-ins
        for (const date of dates) {
          const dateStr = toLocalYMD(date);
          
          await createDailyCheckin(
            user.id,
            dateStr,
            finalLocation,
            undefined, // planned_location
            undefined, // location_change_reason
            notes || undefined,
            startTime,
            endTime
          );
        }
      }

      toast({
        title: "Success",
        description: `Successfully created location entries for ${dates.length} day${dates.length === 1 ? '' : 's'}.`,
      });

      onOpenChange(false);
      resetForm();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving multi-day location entries:', error);
      toast({
        title: "Error",
        description: "Failed to save location entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setLocation('');
    setCustomLocation('');
    setIsFullDay(true);
    setStartTime('09:00');
    setEndTime('17:00');
    setNotes('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const affectedDates = getDateRange();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Add Multi-Day Location Entry
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date Range */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    // Auto-adjust end date if it's before start date
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Date Range Preview */}
            {affectedDates.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Affected dates:</p>
                <div className="flex flex-wrap gap-2">
                  {affectedDates.map((date, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-background px-2 py-1 rounded border"
                    >
                      {getDayName(date)} {format(date, 'M/d')}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {affectedDates.length} day{affectedDates.length === 1 ? '' : 's'} total
                </p>
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <Label>Location *</Label>
            <Select value={location} onValueChange={setLocation}>
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

          {/* Custom Location */}
          {location === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Location *</Label>
              <Input
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Enter custom location name..."
              />
            </div>
          )}

          {/* Time Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fullDay"
                checked={isFullDay}
                onCheckedChange={(checked) => setIsFullDay(checked === true)}
              />
              <Label htmlFor="fullDay" className="text-sm font-medium">
                Full Day
              </Label>
            </div>

            {!isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Start Time *
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    End Time *
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for these location entries..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : `Save ${affectedDates.length} Entries`}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiDayLocationEntryDialog;