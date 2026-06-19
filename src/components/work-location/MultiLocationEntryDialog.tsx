import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { createDailyCheckin, updateDailyCheckin, getUserCheckins, type DailyLocationCheckin } from "@/lib/daily-location-service";

interface LocationEntry {
  id?: string;
  startTime: string;
  endTime: string;
  location: string;
  customLocation?: string;
  notes?: string;
  isFullDay?: boolean;
}

interface MultiLocationEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  plannedLocation?: string;
  onSuccess?: () => void;
}

const MultiLocationEntryDialog: React.FC<MultiLocationEntryDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  plannedLocation,
  onSuccess
}) => {
  const [entries, setEntries] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingCheckins, setExistingCheckins] = useState<DailyLocationCheckin[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const locationOptions = [
    { value: 'collins_square', label: 'Collins Square' },
    { value: 'wfh', label: 'WFH' },
    { value: 'client', label: 'Client Site' },
    { value: 'custom', label: 'Custom Location' },
  ];

  useEffect(() => {
    if (open && user) {
      loadExistingCheckins();
    }
  }, [open, user, selectedDate]);

  const loadExistingCheckins = async () => {
    if (!user) return;
    
    try {
      const checkins = await getUserCheckins(user.id, selectedDate, selectedDate);
      setExistingCheckins(checkins);
      
      if (checkins.length > 0) {
        // Convert existing checkins to entries
        const loadedEntries = checkins.map(checkin => ({
          id: checkin.id,
          startTime: checkin.check_in_time ? new Date(checkin.check_in_time).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '',
          endTime: checkin.end_time 
            ? new Date(checkin.end_time).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            : '',
          location: checkin.actual_location.includes('custom:') ? 'custom' : checkin.actual_location,
          customLocation: checkin.actual_location.includes('custom:') 
            ? checkin.actual_location.replace('custom:', '') 
            : undefined,
          notes: checkin.notes || undefined,
          isFullDay: !checkin.check_in_time || !checkin.end_time
        }));
        setEntries(loadedEntries);
      } else {
        // Start with one entry pre-populated with planned location if available
        setEntries([{
          startTime: '',
          endTime: '',
          location: plannedLocation || '',
          notes: '',
          isFullDay: true
        }]);
      }
    } catch (error) {
      console.error('Error loading existing checkins:', error);
      // Start with one entry pre-populated with planned location if available
      setEntries([{
        startTime: '',
        endTime: '',
        location: plannedLocation || '',
        notes: '',
        isFullDay: true
      }]);
    }
  };

  const addNewEntry = () => {
    setEntries(prev => [...prev, {
      startTime: '',
      endTime: '',
      location: '',
      notes: '',
      isFullDay: true
    }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof LocationEntry, value: string | boolean) => {
    setEntries(prev => prev.map((entry, i) => 
      i === index ? { 
        ...entry, 
        [field]: field === 'isFullDay' ? value === 'true' || value === true : value 
      } : entry
    ));
  };

  const handleSubmit = async () => {
    if (!user) return;

    const validEntries = entries.filter(entry => 
      entry.location &&
      (entry.isFullDay || (entry.startTime && entry.endTime)) &&
      (entry.location !== 'custom' || entry.customLocation?.trim())
    );

    if (validEntries.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one valid location entry.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create separate records for each valid entry
      for (const entry of validEntries) {
        const finalLocation = entry.location === 'custom' 
          ? `custom:${entry.customLocation?.trim()}` 
          : entry.location;

        if (entry.id) {
          // Update existing checkin
          await updateDailyCheckin(
            entry.id,
            finalLocation,
            undefined,
            entry.notes,
            entry.isFullDay ? undefined : entry.startTime,
            entry.isFullDay ? undefined : entry.endTime,
            selectedDate
          );
        } else {
          // Create new checkin
          await createDailyCheckin(
            user.id,
            selectedDate,
            finalLocation,
            undefined,
            undefined,
            entry.notes,
            entry.isFullDay ? undefined : entry.startTime,
            entry.isFullDay ? undefined : entry.endTime
          );
        }
      }

      toast({
        title: "Success",
        description: `Successfully saved ${validEntries.length} location entries.`,
      });

      onOpenChange(false);
      setEntries([]);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving location entries:', error);
      toast({
        title: "Error",
        description: "Failed to save location entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setEntries([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Locations for {new Date(selectedDate).toLocaleDateString('en-AU')}
          </DialogTitle>
          {plannedLocation && (
            <p className="text-sm text-muted-foreground">
              Planned: {locationOptions.find(opt => opt.value === plannedLocation)?.label || plannedLocation}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Add multiple location entries for different times during the day
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={addNewEntry}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </div>
          
          {entries.map((entry, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {entries.length > 1 ? `Location ${index + 1}` : 'Location Entry'}
                </Badge>
                {entries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`full-day-${index}`}
                    checked={entry.isFullDay || false}
                    onCheckedChange={(checked) => updateEntry(index, 'isFullDay', checked ? 'true' : 'false')}
                  />
                  <Label htmlFor={`full-day-${index}`}>Full Day</Label>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {!entry.isFullDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>From Time *</Label>
                        <Input
                          type="time"
                          value={entry.startTime}
                          onChange={(e) => updateEntry(index, 'startTime', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>End Time *</Label>
                        <Input
                          type="time"
                          value={entry.endTime}
                          onChange={(e) => updateEntry(index, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Select
                      value={entry.location}
                      onValueChange={(value) => updateEntry(index, 'location', value)}
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
                </div>
              </div>

              {entry.location === 'custom' && (
                <div className="space-y-2">
                  <Label>Custom Location *</Label>
                  <Input
                    value={entry.customLocation || ''}
                    onChange={(e) => updateEntry(index, 'customLocation', e.target.value)}
                    placeholder="Enter custom location name..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={entry.notes || ''}
                  onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>
            </div>
          ))}


          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save All Locations'}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiLocationEntryDialog;