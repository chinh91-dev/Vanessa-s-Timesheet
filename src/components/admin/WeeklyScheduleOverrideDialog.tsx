import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, RotateCcw, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWeeklyWorkSchedule } from "@/hooks/useWeeklyWorkSchedule";

interface WeeklyScheduleOverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    full_name?: string;
    employment_type?: string;
    default_monday_office?: boolean;
    default_tuesday_office?: boolean;
    default_wednesday_office?: boolean;
    default_thursday_office?: boolean;
    default_friday_office?: boolean;
  };
  weekStartDate: Date;
  onUpdate: () => void;
}

const LOCATION_OPTIONS = [
  { value: 'collins_square', label: 'Collins Square' },
  { value: 'wfh', label: 'WFH' },
  { value: 'client', label: 'Client Site' },
];

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const WeeklyScheduleOverrideDialog: React.FC<WeeklyScheduleOverrideDialogProps> = ({
  isOpen,
  onClose,
  user,
  weekStartDate,
  onUpdate,
}) => {
  const {
    weeklySchedule,
    effectiveDailyHours,
    updateWeeklySchedule,
    reload,
    loading,
    hasWeeklyOverride,
  } = useWeeklyWorkSchedule(user.id, weekStartDate);

  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({});
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize form state when dialog opens or data loads
  useEffect(() => {
    if (isOpen && weeklySchedule) {
      // Initialize working days from weekly schedule
      setWorkingDays({
        monday: weeklySchedule.monday_working || false,
        tuesday: weeklySchedule.tuesday_working || false,
        wednesday: weeklySchedule.wednesday_working || false,
        thursday: weeklySchedule.thursday_working || false,
        friday: weeklySchedule.friday_working || false,
        saturday: weeklySchedule.saturday_working || false,
        sunday: weeklySchedule.sunday_working || false,
      });

      // Initialize locations from weekly schedule
      setLocations({
        monday: weeklySchedule.monday_location || '',
        tuesday: weeklySchedule.tuesday_location || '',
        wednesday: weeklySchedule.wednesday_location || '',
        thursday: weeklySchedule.thursday_location || '',
        friday: weeklySchedule.friday_location || '',
        saturday: weeklySchedule.saturday_location || '',
        sunday: weeklySchedule.sunday_location || '',
      });
    } else if (isOpen && !weeklySchedule) {
      // Initialize from defaults when no weekly override exists
      const isFullTimeOrFixedTerm = ['full-time', 'fixed-term'].includes(user.employment_type || '');
      const defaultWorkingDays = {
        monday: isFullTimeOrFixedTerm ? true : (user.default_monday_office || false),
        tuesday: isFullTimeOrFixedTerm ? true : (user.default_tuesday_office || false),
        wednesday: isFullTimeOrFixedTerm ? true : (user.default_wednesday_office || false),
        thursday: isFullTimeOrFixedTerm ? true : (user.default_thursday_office || false),
        friday: isFullTimeOrFixedTerm ? true : (user.default_friday_office || false),
        saturday: false,
        sunday: false,
      };

      setWorkingDays(defaultWorkingDays);
      setLocations({
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
      });
    }
  }, [isOpen, weeklySchedule, user]);

  const handleWorkingDayChange = (day: string, working: boolean) => {
    setWorkingDays(prev => ({
      ...prev,
      [day]: working
    }));

    // Clear location if not working
    if (!working) {
      setLocations(prev => ({
        ...prev,
        [day]: ''
      }));
    } else if (!locations[day]) {
      // Set default location if working but no location set
      setLocations(prev => ({
        ...prev,
        [day]: 'collins_square'
      }));
    }
  };

  const handleLocationChange = (day: string, location: string) => {
    setLocations(prev => ({
      ...prev,
      [day]: location
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const scheduleData = {
        monday_working: workingDays.monday,
        tuesday_working: workingDays.tuesday,
        wednesday_working: workingDays.wednesday,
        thursday_working: workingDays.thursday,
        friday_working: workingDays.friday,
        saturday_working: workingDays.saturday,
        sunday_working: workingDays.sunday,
        monday_location: workingDays.monday ? locations.monday : null,
        tuesday_location: workingDays.tuesday ? locations.tuesday : null,
        wednesday_location: workingDays.wednesday ? locations.wednesday : null,
        thursday_location: workingDays.thursday ? locations.thursday : null,
        friday_location: workingDays.friday ? locations.friday : null,
        saturday_location: workingDays.saturday ? locations.saturday : null,
        sunday_location: workingDays.sunday ? locations.sunday : null,
      };

      await updateWeeklySchedule(scheduleData);
      
      toast({
        title: "Success",
        description: "Weekly schedule updated successfully",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving weekly schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update weekly schedule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToDefault = async () => {
    setSaving(true);
    try {
      // Import the service function
      const { deleteWeeklyWorkSchedule } = await import('@/lib/weekly-work-schedule-service');
      
      // Delete weekly override to revert to defaults
      await deleteWeeklyWorkSchedule(user.id, weekStartDate);

      toast({
        title: "Success",
        description: "Reverted to default schedule",
      });

      reload();
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error reverting to default:', error);
      toast({
        title: "Error",
        description: "Failed to revert to default schedule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Schedule Override
          </DialogTitle>
          <DialogDescription>
            Override the work schedule for <strong>{user.full_name || user.email}</strong>
            <br />
            Week: {formatWeekRange(weekStartDate)}
            {hasWeeklyOverride && (
              <Badge variant="outline" className="ml-2 text-xs">
                Currently Overridden
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading current schedule...
          </div>
        ) : (
          <div className="space-y-6">
            {DAYS.map(({ key, label }) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{label}</Label>
                  <Switch
                    checked={workingDays[key] || false}
                    onCheckedChange={(checked) => handleWorkingDayChange(key, checked)}
                  />
                </div>

                {workingDays[key] && (
                  <div className="ml-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Location</Label>
                    </div>
                    <Select
                      value={locations[key] || ''}
                      onValueChange={(value) => handleLocationChange(key, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {key !== 'sunday' && <Separator />}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {hasWeeklyOverride && (
              <Button
                variant="outline"
                onClick={handleRevertToDefault}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert to Default
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Override'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyScheduleOverrideDialog;