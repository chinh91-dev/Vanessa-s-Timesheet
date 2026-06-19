
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWeeklyWorkSchedule } from "@/hooks/useWeeklyWorkSchedule";
import { Calendar, Save, RotateCcw, MapPin } from "lucide-react";
import { useState } from "react";
import type { UserWithRole } from "@/lib/user-service";


interface UserWeeklyWorkScheduleCardProps {
  user: UserWithRole;
  weekStartDate: Date;
}

const UserWeeklyWorkScheduleCard: React.FC<UserWeeklyWorkScheduleCardProps> = ({ user, weekStartDate }) => {
  const { 
    weeklySchedule, 
    effectiveDailyHours, 
    updateWeeklySchedule, 
    loading, 
    error, 
    hasWeeklyOverride 
  } = useWeeklyWorkSchedule(user.id, weekStartDate);

  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    monday_hours: 8,
    tuesday_hours: 8,
    wednesday_hours: 8,
    thursday_hours: 8,
    friday_hours: 8,
    saturday_hours: 0,
    sunday_hours: 0,
    notes: "",
  });

  React.useEffect(() => {
    if (effectiveDailyHours) {
      setFormData({
        monday_hours: effectiveDailyHours.monday,
        tuesday_hours: effectiveDailyHours.tuesday,
        wednesday_hours: effectiveDailyHours.wednesday,
        thursday_hours: effectiveDailyHours.thursday,
        friday_hours: effectiveDailyHours.friday,
        saturday_hours: effectiveDailyHours.saturday,
        sunday_hours: effectiveDailyHours.sunday,
        notes: weeklySchedule?.notes || "",
      });
    }
  }, [effectiveDailyHours, weeklySchedule]);

  const handleSave = async () => {
    console.log(`Admin updating weekly work schedule for ${user.email}:`, formData);
    await updateWeeklySchedule(formData);
    setEditMode(false);
  };

  const handleReset = () => {
    setFormData({
      monday_hours: effectiveDailyHours.monday,
      tuesday_hours: effectiveDailyHours.tuesday,
      wednesday_hours: effectiveDailyHours.wednesday,
      thursday_hours: effectiveDailyHours.thursday,
      friday_hours: effectiveDailyHours.friday,
      saturday_hours: effectiveDailyHours.saturday,
      sunday_hours: effectiveDailyHours.sunday,
      notes: weeklySchedule?.notes || "",
    });
    setEditMode(false);
  };

  const weeklyTotal = Object.values(effectiveDailyHours).reduce((sum, hours) => sum + hours, 0);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {user.full_name || user.email}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasWeeklyOverride && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Custom
              </Badge>
            )}
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role || "employee"}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">
            Failed to load weekly work schedule
          </div>
        ) : (
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="schedule" className="space-y-3">
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(formData).filter(([key]) => key.endsWith('_hours')).map(([key, value]) => (
                      <div key={key}>
                        <Label htmlFor={key} className="capitalize">
                          {key.replace('_hours', '')}
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={value}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [key]: parseFloat(e.target.value) || 0
                          }))}
                          className="h-8"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="flex-1">
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button onClick={handleReset} variant="outline" size="sm" className="flex-1">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(effectiveDailyHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize font-medium">{day}:</span>
                        <span>{hours}h</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => setEditMode(true)} variant="outline" size="sm" className="w-full">
                    Edit Schedule
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="details" className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weekly Total:</span>
                  <span className="font-medium">{weeklyTotal}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schedule Type:</span>
                  <span className="font-medium">{hasWeeklyOverride ? "Custom" : "Default"}</span>
                </div>
                {weeklySchedule?.notes && (
                  <div>
                    <span className="text-muted-foreground text-xs">Notes:</span>
                    <p className="text-xs mt-1 p-2 bg-muted rounded">{weeklySchedule.notes}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
        
      </Card>
    );
  };

export default UserWeeklyWorkScheduleCard;
