import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Plus, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { upsertWorkLocationEntry } from "@/lib/work-location-service";
import { getMondayFirstDayOfWeek, getWeekStart } from "@/lib/date-utils";

interface WorkLocationManagerProps {
  selectedDate?: string;
  onLocationAdded?: () => void;
}

const WorkLocationManager: React.FC<WorkLocationManagerProps> = ({
  selectedDate,
  onLocationAdded
}) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (selectedDate) {
      setStartDate(new Date(selectedDate));
      setOpen(true);
    }
  }, [selectedDate]);

  const locationOptions = [
    { value: 'collins_square', label: 'Collins Square' },
    { value: 'wfh', label: 'WFH' },
    { value: 'client', label: 'Client Site' },
    { value: 'custom', label: 'Custom Location' },
  ];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !startDate || !location || (location === 'custom' && !customLocation.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const current = new Date(startDate);
      const end = endDate || startDate;
      
      // Process each day in the range
      while (current <= end) {
        const weekStart = getWeekStart(current);
        const weekStartStr = weekStart.toLocaleDateString('en-CA');
        const dayOfWeek = getMondayFirstDayOfWeek(current); // Monday=0 system
        
        // Map day of week to database column (Monday=0 system)
        const dayMapping = {
          0: 'monday_location',
          1: 'tuesday_location',
          2: 'wednesday_location',
          3: 'thursday_location',
          4: 'friday_location',
          5: 'saturday_location',
          6: 'sunday_location',
        };
        
        const locationField = dayMapping[dayOfWeek as keyof typeof dayMapping];
        const finalLocation = location === 'custom' ? customLocation.trim() : location;
        
        await upsertWorkLocationEntry(user.id, weekStartStr, {
          [locationField]: finalLocation,
          notes: notes || undefined,
        });
        
        // Move to next day
        current.setDate(current.getDate() + 1);
      }
      
      toast({
        title: "Success",
        description: "Work location updated successfully.",
      });
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setLocation('');
      setCustomLocation('');
      setNotes('');
      setOpen(false);
      
      // Notify parent component
      if (onLocationAdded) {
        onLocationAdded();
      }
    } catch (error) {
      console.error('Error updating work location:', error);
      toast({
        title: "Error",
        description: "Failed to update work location.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickActions = (action: string) => {
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    switch (action) {
      case 'week-remote':
        setStartDate(weekStart);
        setEndDate(weekEnd);
        setLocation('wfh');
        break;
      case 'week-office':
        setStartDate(weekStart);
        setEndDate(weekEnd);
        setLocation('collins_square');
        break;
      case 'today-remote':
        setStartDate(today);
        setEndDate(undefined);
        setLocation('wfh');
        break;
      case 'today-office':
        setStartDate(today);
        setEndDate(undefined);
        setLocation('collins_square');
        break;
    }
    setOpen(true);
  };

  return (
    <Card className="bg-gradient-to-r from-background to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          Manage Work Locations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Quick Actions</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={() => handleQuickActions('today-office')}
                className="h-12 flex-col gap-1 hover:bg-blue-50 hover:border-blue-200"
              >
                <span className="font-medium">Today</span>
                <span className="text-xs text-muted-foreground">Office</span>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => handleQuickActions('today-remote')}
                className="h-12 flex-col gap-1 hover:bg-green-50 hover:border-green-200"
              >
                <span className="font-medium">Today</span>
                <span className="text-xs text-muted-foreground">Remote</span>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => handleQuickActions('week-office')}
                className="h-12 flex-col gap-1 hover:bg-blue-50 hover:border-blue-200"
              >
                <span className="font-medium">This Week</span>
                <span className="text-xs text-muted-foreground">Office</span>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => handleQuickActions('week-remote')}
                className="h-12 flex-col gap-1 hover:bg-green-50 hover:border-green-200"
              >
                <span className="font-medium">This Week</span>
                <span className="text-xs text-muted-foreground">Remote</span>
              </Button>
            </div>
          </div>
          
          {/* Custom Entry */}
          <div className="pt-2 border-t">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-12 text-base">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Custom Location
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Work Location</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : <span>Single day</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => startDate ? date < startDate : false}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
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

                  {location === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-location">Custom Location *</Label>
                      <Input
                        id="custom-location"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="Enter custom location name..."
                        className="w-full"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes about the location..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Location'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkLocationManager;