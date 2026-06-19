import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Save, X, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getLocationOptions, updateDefaultWorkLocations } from "@/lib/work-schedule-location-service";
import { applyTemplateToWeek, fetchWeeklyWorkSchedule } from "@/lib/weekly-work-schedule-service";
import { syncWeeklySchedulesWithProfiles } from "@/lib/work-schedule-sync-service";
import { formatDate } from "@/lib/date-utils";

interface DefaultOfficeDayTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    full_name?: string;
    email: string;
    employment_type?: string;
    default_monday_office?: boolean;
    default_tuesday_office?: boolean;
    default_wednesday_office?: boolean;
    default_thursday_office?: boolean;
    default_friday_office?: boolean;
  };
  currentOfficeDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
  };
  onUpdate?: () => void;
  weekStartDate?: Date;
}

interface DefaultOfficeDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  [key: string]: boolean;
}

interface DefaultLocations {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  [key: string]: string;
}

const DefaultOfficeDayTemplateDialog: React.FC<DefaultOfficeDayTemplateDialogProps> = ({
  isOpen,
  onClose,
  user,
  currentOfficeDays,
  onUpdate,
  weekStartDate = new Date(),
}) => {
  // State for fresh data
  const [freshProfile, setFreshProfile] = useState(user);
  const [isLoadingFreshData, setIsLoadingFreshData] = useState(false);
  
  // Initialize with fresh data instead of potentially stale user prop
  const [initialDays, setInitialDays] = useState<DefaultOfficeDays>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
  });

  // Pending changes state - will be updated with fresh data
  const [pendingDays, setPendingDays] = useState<DefaultOfficeDays>(initialDays);
  const [pendingLocations, setPendingLocations] = useState<DefaultLocations>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [locationOptions] = useState(getLocationOptions());

  const weekdays = [
    { key: 'monday' as keyof DefaultOfficeDays, label: 'Mon', fullLabel: 'Monday' },
    { key: 'tuesday' as keyof DefaultOfficeDays, label: 'Tue', fullLabel: 'Tuesday' },
    { key: 'wednesday' as keyof DefaultOfficeDays, label: 'Wed', fullLabel: 'Wednesday' },
    { key: 'thursday' as keyof DefaultOfficeDays, label: 'Thu', fullLabel: 'Thursday' },
    { key: 'friday' as keyof DefaultOfficeDays, label: 'Fri', fullLabel: 'Friday' },
  ];

  // Load fresh data when dialog opens
  useEffect(() => {
    const loadFreshData = async () => {
      if (!isOpen) return;
      
      setIsLoadingFreshData(true);
      
      try {
        // Fetch fresh profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, employment_type, default_monday_office, default_tuesday_office, default_wednesday_office, default_thursday_office, default_friday_office')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Update fresh profile state
        setFreshProfile(profileData);

        // Calculate fresh initial days
        const hasExistingPreferences = 
          profileData.default_monday_office !== null ||
          profileData.default_tuesday_office !== null ||
          profileData.default_wednesday_office !== null ||
          profileData.default_thursday_office !== null ||
          profileData.default_friday_office !== null;

        let freshDays: DefaultOfficeDays;
        
        // If no existing preferences and user is full-time, default to Monday-Friday
        if (!hasExistingPreferences && profileData.employment_type === 'full-time') {
          freshDays = {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
          };
        } else {
          // Otherwise use existing preferences or false for part-time
          freshDays = {
            monday: profileData.default_monday_office ?? false,
            tuesday: profileData.default_tuesday_office ?? false,
            wednesday: profileData.default_wednesday_office ?? false,
            thursday: profileData.default_thursday_office ?? false,
            friday: profileData.default_friday_office ?? false,
          };
        }

        setInitialDays(freshDays);
        setPendingDays(freshDays);

        // Load existing locations
        const { data: workSchedule } = await supabase
          .from('work_schedules')
          .select('default_monday_location, default_tuesday_location, default_wednesday_location, default_thursday_location, default_friday_location')
          .eq('user_id', user.id)
          .single();

        if (workSchedule) {
          setPendingLocations({
            monday: workSchedule.default_monday_location || '',
            tuesday: workSchedule.default_tuesday_location || '',
            wednesday: workSchedule.default_wednesday_location || '',
            thursday: workSchedule.default_thursday_location || '',
            friday: workSchedule.default_friday_location || '',
          });
        }
        
      } catch (error) {
        console.error('Error loading fresh data:', error);
        // Fallback to original user prop data
        setFreshProfile(user);
        const fallbackDays = {
          monday: user.default_monday_office ?? false,
          tuesday: user.default_tuesday_office ?? false,
          wednesday: user.default_wednesday_office ?? false,
          thursday: user.default_thursday_office ?? false,
          friday: user.default_friday_office ?? false,
        };
        setInitialDays(fallbackDays);
        setPendingDays(fallbackDays);
      } finally {
        setIsLoadingFreshData(false);
      }
    };

    loadFreshData();
  }, [isOpen, user.id]);

  const handleDayToggle = (day: keyof DefaultOfficeDays, checked: boolean) => {
    setPendingDays(prev => ({
      ...prev,
      [day]: checked
    }));
    
    // Clear location when day is unchecked
    if (!checked) {
      setPendingLocations(prev => ({
        ...prev,
        [day]: ''
      }));
    }
  };

  const handleLocationChange = (day: keyof DefaultLocations, location: string) => {
    setPendingLocations(prev => ({
      ...prev,
      [day]: location
    }));
  };

  const handleSaveAndApply = async () => {
    setIsUpdating(true);

    try {
      // 1. Update office days in profiles table (save template)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          default_monday_office: pendingDays.monday,
          default_tuesday_office: pendingDays.tuesday,
          default_wednesday_office: pendingDays.wednesday,
          default_thursday_office: pendingDays.thursday,
          default_friday_office: pendingDays.friday,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Update locations in work_schedules table (save template locations)
      const locationAssignment = {
        monday: pendingDays.monday ? pendingLocations.monday : null,
        tuesday: pendingDays.tuesday ? pendingLocations.tuesday : null,
        wednesday: pendingDays.wednesday ? pendingLocations.wednesday : null,
        thursday: pendingDays.thursday ? pendingLocations.thursday : null,
        friday: pendingDays.friday ? pendingLocations.friday : null,
      };

      const selectedCount = Object.values(pendingDays).filter(Boolean).length;
      const locationSuccess = await updateDefaultWorkLocations(user.id, locationAssignment, selectedCount);
      if (!locationSuccess) {
        console.warn('Failed to update default locations, but office days were saved');
      }

      // 3. Auto-apply template to current week if no override exists
      let appliedToCurrentWeek = false;
      try {
        const existingWeeklySchedule = await fetchWeeklyWorkSchedule(user.id, weekStartDate);
        
        if (!existingWeeklySchedule) {
          console.log('No existing weekly schedule found, applying template to current week');
          await applyTemplateToWeek(user.id, weekStartDate, pendingDays, pendingLocations);
          appliedToCurrentWeek = true;
        } else {
          console.log('Weekly schedule already exists, template saved but not applied to current week');
        }
      } catch (weeklyError) {
        console.warn('Failed to apply template to current week:', weeklyError);
      }

      // 4. Auto-sync template with all weekly schedules
      let syncResults = null;
      try {
        console.log('Auto-syncing template with weekly schedules...');
        syncResults = await syncWeeklySchedulesWithProfiles(weekStartDate, [user.id]);
        console.log('Sync results:', syncResults);
      } catch (syncError) {
        console.warn('Failed to auto-sync schedules:', syncError);
      }

      // Enhanced success message based on what was applied
      const baseMessage = `Template saved (${selectedCount} office day${selectedCount !== 1 ? 's' : ''})`;
      let fullMessage = baseMessage;
      
      if (appliedToCurrentWeek && syncResults) {
        fullMessage = `${baseMessage}, applied to current week, and synced with schedules`;
      } else if (appliedToCurrentWeek) {
        fullMessage = `${baseMessage} and applied to current week`;
      } else if (syncResults) {
        fullMessage = `${baseMessage} and synced with schedules`;
      }

      toast({
        title: "Template Saved & Applied",
        description: fullMessage,
      });

      console.log('Template save complete, triggering UI update');
      
      // Call onUpdate to trigger cache invalidation
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("Error saving and applying template:", error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
      
      // Still trigger update to refresh cache even on partial failure
      console.log('Template save failed, but triggering cache refresh anyway');
      onUpdate?.();
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedCount = Object.values(pendingDays).filter(Boolean).length;
  const hasPendingChanges = JSON.stringify(pendingDays) !== JSON.stringify(initialDays);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Default Work Schedule Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingFreshData ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading current template...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{freshProfile.full_name || freshProfile.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {freshProfile.employment_type === 'full-time' ? 'Full-time Employee' : 'Part-time Employee'}
                  </p>
                </div>
            <Badge variant="secondary">
              {selectedCount} day{selectedCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Standard Office Days & Locations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set the consistent office day schedule and work locations for this employee. This template will automatically apply to new weeks and can be used as a base for weekly customizations.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {weekdays.map((weekday) => (
                <div key={weekday.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <Checkbox
                        id={`default-${weekday.key}`}
                        checked={pendingDays[weekday.key]}
                        onCheckedChange={(checked) => 
                          handleDayToggle(weekday.key, checked as boolean)
                        }
                        className={hasPendingChanges ? "border-blue-500" : ""}
                      />
                      <label 
                        htmlFor={`default-${weekday.key}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {weekday.fullLabel}
                      </label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {weekday.label}
                    </span>
                  </div>
                  
                  {pendingDays[weekday.key] && (
                    <div className="ml-6 flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <Select
                        value={pendingLocations[weekday.key]}
                        onValueChange={(value) => handleLocationChange(weekday.key, value)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}

              {selectedCount === 0 && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    No office days required - fully flexible
                  </p>
                </div>
              )}
              
              {hasPendingChanges && (
                <div className="text-center py-2">
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    {selectedCount} day{selectedCount !== 1 ? 's' : ''} pending save
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAndApply} 
              disabled={isUpdating}
            >
              <Save className="h-4 w-4 mr-2" />
              {isUpdating ? "Saving & Applying..." : "Save Template"}
            </Button>
          </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DefaultOfficeDayTemplateDialog;