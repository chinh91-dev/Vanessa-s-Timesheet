import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { 
  getWorkScheduleWithLocations, 
  updateDefaultWorkLocations, 
  getLocationOptions,
  getLocationDisplayName,
  type LocationAssignment 
} from "@/lib/work-schedule-location-service";
import { Loader2, MapPin } from "lucide-react";

const DefaultWorkLocationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<LocationAssignment>({});
  
  const locationOptions = getLocationOptions();
  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  useEffect(() => {
    if (user?.id) {
      loadCurrentLocations();
    }
  }, [user?.id]);

  const loadCurrentLocations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const workSchedule = await getWorkScheduleWithLocations(user.id);
      if (workSchedule) {
        setLocations({
          monday: workSchedule.default_monday_location || undefined,
          tuesday: workSchedule.default_tuesday_location || undefined,
          wednesday: workSchedule.default_wednesday_location || undefined,
          thursday: workSchedule.default_thursday_location || undefined,
          friday: workSchedule.default_friday_location || undefined,
          saturday: workSchedule.default_saturday_location || undefined,
          sunday: workSchedule.default_sunday_location || undefined,
        });
      }
    } catch (error) {
      console.error('Error loading work schedule:', error);
      toast({
        title: "Error",
        description: "Failed to load current location settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (day: keyof LocationAssignment, value: string) => {
    setLocations(prev => ({
      ...prev,
      [day]: value === "" ? undefined : value
    }));
  };

  const handleQuickSet = (location: string, days: string[]) => {
    const updates: Partial<LocationAssignment> = {};
    days.forEach(day => {
      updates[day as keyof LocationAssignment] = location;
    });
    setLocations(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const success = await updateDefaultWorkLocations(user.id, locations);
      if (success) {
        toast({
          title: "Success",
          description: "Default work locations updated successfully",
        });
      } else {
        throw new Error("Failed to update locations");
      }
    } catch (error) {
      console.error('Error updating default locations:', error);
      toast({
        title: "Error",
        description: "Failed to update default locations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          My Default Work Locations
        </CardTitle>
        <CardDescription>
          Set your default work location for each day of the week. These will be used as your planned location unless overridden for a specific week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSet('collins_square', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
            >
              Set Weekdays to Collins Square
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSet('wfh', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
            >
              Set Weekdays to WFH
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSet('client', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
            >
              Set Weekdays to Client Site
            </Button>
          </div>
        </div>

        {/* Day-by-day Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Weekly Schedule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {daysOfWeek.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Select
                  value={locations[key as keyof LocationAssignment] || ""}
                  onValueChange={(value) => handleLocationChange(key as keyof LocationAssignment, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No default location">
                      {locations[key as keyof LocationAssignment] 
                        ? getLocationDisplayName(locations[key as keyof LocationAssignment]!)
                        : "No default location"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No default location</SelectItem>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Locations'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DefaultWorkLocationManager;