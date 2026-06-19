
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useWorkSchedule } from "@/hooks/useWorkSchedule";
import { useQueryClient } from "@tanstack/react-query";
import { useWeekendLock } from "@/hooks/useWeekendLock";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, Target, Calendar as CalendarWeekend, CheckCircle, XCircle, RefreshCw, Building2, Edit, MapPin, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import WorkingDaysDisplay from "@/components/admin/WorkingDaysDisplay";
import DefaultOfficeDayTemplateDialog from "@/components/admin/DefaultOfficeDayTemplateDialog";
import WeeklyScheduleOverrideDialog from "@/components/admin/WeeklyScheduleOverrideDialog";
import { useWeeklyWorkSchedule } from "@/hooks/useWeeklyWorkSchedule";
import { supabase } from "@/integrations/supabase/client";
import type { UserWithRole } from "@/lib/user-service";

interface UnifiedUserScheduleCardProps {
  user: UserWithRole & {
    employment_type?: string;
    default_monday_office?: boolean;
    default_tuesday_office?: boolean;
    default_wednesday_office?: boolean;
    default_thursday_office?: boolean;
    default_friday_office?: boolean;
  };
  weekStartDate: Date;
}

const UnifiedUserScheduleCard: React.FC<UnifiedUserScheduleCardProps> = ({
  user,
  weekStartDate
}) => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = userRole === "admin";
  const [updatingWeekend, setUpdatingWeekend] = useState(false);
  const [showDefaultTemplateDialog, setShowDefaultTemplateDialog] = useState(false);
  const [showWeeklyOverrideDialog, setShowWeeklyOverrideDialog] = useState(false);
  const [freshProfileData, setFreshProfileData] = useState(null);
  const [loadingFreshProfile, setLoadingFreshProfile] = useState(true);

  const {
    workingDays,
    workScheduleData, // Get complete work schedule data including locations
    loading: globalLoading,
    error: globalError,
    reload: reloadWorkSchedule
  } = useWorkSchedule(user.id);

  const {
    weeklySchedule,
    effectiveDailySchedule,
    hasWeeklyOverride,
    loading: weeklyScheduleLoading,
    reload: reloadWeeklySchedule
  } = useWeeklyWorkSchedule(user.id, weekStartDate, workScheduleData); // Pass workScheduleData for location fallbacks

  // Calculate working days from weekly schedule - use workingDays as fallback instead of hardcoded 5
  const effectiveDays = effectiveDailySchedule ? 
    Object.values(effectiveDailySchedule).filter(schedule => (schedule as any).working).length : 
    (workingDays || 0);
  
  const effectiveHours = effectiveDays * 8; // Assume 8 hours per day
  const isAutoCalculated = !hasWeeklyOverride;
  const calculationSource = hasWeeklyOverride ? 'manual' : 
    (['full-time', 'fixed-term'].includes(user.employment_type || '') ? 'full-time-default' : 'template');

  const {
    canLogWeekendHours,
    allowWeekendEntries, // Use this for toggle state instead of canLogWeekendHours
    loading: weekendLoading,
    error: weekendError,
    updateWeekendPermission,
    refreshPermissions
  } = useWeekendLock(user.id);

  // Fetch fresh profile data on component mount to ensure template display is current
  useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        setLoadingFreshProfile(true);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching fresh profile:', error);
        } else {
          setFreshProfileData(profile);
        }
      } catch (error) {
        console.error('Error in fetchFreshProfile:', error);
      } finally {
        setLoadingFreshProfile(false);
      }
    };

    fetchFreshProfile();
  }, [user.id]);

  // Use fresh profile data for template display, fallback to user prop
  const profileDataForTemplate = freshProfileData || user;

  // Prepare default template for part-time employees
  const defaultTemplate = profileDataForTemplate.employment_type === 'part-time' ? {
    monday: profileDataForTemplate.default_monday_office ?? false,
    tuesday: profileDataForTemplate.default_tuesday_office ?? false,
    wednesday: profileDataForTemplate.default_wednesday_office ?? false,
    thursday: profileDataForTemplate.default_thursday_office ?? false,
    friday: profileDataForTemplate.default_friday_office ?? false,
  } : undefined;

  // Office days now only come from profiles - use fresh data for template display
  const officeDays = {
    monday: profileDataForTemplate.default_monday_office ?? false,
    tuesday: profileDataForTemplate.default_tuesday_office ?? false,
    wednesday: profileDataForTemplate.default_wednesday_office ?? false,
    thursday: profileDataForTemplate.default_thursday_office ?? false,
    friday: profileDataForTemplate.default_friday_office ?? false,
  };
  const hasOfficeRequirements = Object.values(officeDays).some(Boolean);

  const handleWeekendToggle = async (enabled: boolean) => {
    if (!isAdmin) return;
    
    console.log(`Admin toggling weekend permission for user ${user.email} to: ${enabled}`);
    setUpdatingWeekend(true);
    
    try {
      const success = await updateWeekendPermission(enabled);
      if (!success) {
        console.error("Failed to update weekend permission");
      } else {
        console.log(`Successfully toggled weekend permission to: ${enabled}`);
      }
    } catch (error) {
      console.error("Error in handleWeekendToggle:", error);
    } finally {
      setUpdatingWeekend(false);
    }
  };

  const handleRefreshPermissions = () => {
    console.log(`Manually refreshing permissions for user ${user.email}`);
    refreshPermissions();
    reloadWorkSchedule();
    reloadWeeklySchedule();
  };

  const handleDataUpdate = () => {
    console.log('Template updated - invalidating caches for user:', user.email);
    
    // Invalidate all relevant queries with specific user targeting
    queryClient.invalidateQueries({ queryKey: ['weeklyWorkSchedule'] });
    queryClient.invalidateQueries({ queryKey: ['weeklyWorkSchedule', user.id] }); // Add specific user invalidation
    queryClient.invalidateQueries({ queryKey: ['workSchedule'] });
    queryClient.invalidateQueries({ queryKey: ['user-profile-with-locations-v3', user.id] }); // Fixed: Use correct query key
    queryClient.invalidateQueries({ queryKey: ['weeklySchedules'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    
    // Force refetch queries to ensure UI updates
    queryClient.refetchQueries({ queryKey: ['user-profile-with-locations-v3', user.id] }); // Fixed: Use correct query key
    queryClient.refetchQueries({ queryKey: ['weeklyWorkSchedule'] });
    queryClient.refetchQueries({ queryKey: ['weeklyWorkSchedule', user.id] }); // Add specific user refetch
    
    console.log('Query invalidation complete, triggering manual reloads');
    
    // Refresh fresh profile data
    const fetchFreshProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching fresh profile:', error);
        } else {
          setFreshProfileData(profile);
        }
      } catch (error) {
        console.error('Error in fetchFreshProfile:', error);
      }
    };
    
    fetchFreshProfile();
    
    // Also trigger manual reloads as backup
    reloadWorkSchedule();
    reloadWeeklySchedule();
    refreshPermissions();
  };

  if (globalLoading || weeklyScheduleLoading || weekendLoading || loadingFreshProfile) {
    return <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>;
  }

  if (globalError || weekendError) {
    return <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {user.full_name || user.email}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-destructive">
              Failed to load work schedule data
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshPermissions}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>;
  }

  return <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {user.full_name || user.email}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasWeeklyOverride && <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Custom
              </Badge>}
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role || "employee"}
            </Badge>
            {/* Admin override indicator */}
            {user.role === "admin" && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                Weekend Override
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* This Week Schedule */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">This Week</span>
              {hasWeeklyOverride && <div className="h-2 w-2 bg-blue-500 rounded-full" />}
            </div>
            
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWeeklyOverrideDialog(true)}
                className="text-xs h-8"
              >
                <Settings className="h-3 w-3 mr-1" />
                Override This Week
              </Button>
            )}
          </div>
          
          <WorkingDaysDisplay 
            effectiveDays={effectiveDays}
            effectiveHours={effectiveHours}
            isAutoCalculated={isAutoCalculated}
            calculationSource={calculationSource}
            isLoading={weeklyScheduleLoading}
            effectiveDailySchedule={effectiveDailySchedule}
            hasWeeklyOverride={hasWeeklyOverride}
          />

          {/* Weekly Locations Display */}
          {effectiveDailySchedule && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Weekly Locations:</div>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(effectiveDailySchedule)
                  .filter(([_, schedule]) => (schedule as any).working)
                  .map(([day, schedule]) => (
                    <div key={day} className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium">{day}</span>
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {(schedule as any).location || 'Not set'}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Enhanced Weekend Permissions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarWeekend className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Weekend Entries</span>
              {/* Visual status indicator based on effective permission */}
              {canLogWeekendHours ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshPermissions}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {isAdmin ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Allow weekend hour logging
                </div>
                <Switch
                  checked={allowWeekendEntries} // Use raw permission, not effective permission
                  onCheckedChange={handleWeekendToggle}
                  disabled={updatingWeekend}
                />
              </div>
              
              {updatingWeekend && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                  Updating weekend permissions...
                </div>
              )}
              
              {/* Enhanced status display showing both raw and effective permissions */}
              <div className="space-y-1">
                <div className={`text-xs p-2 rounded border ${
                  allowWeekendEntries 
                    ? "text-green-700 bg-green-50 border-green-200" 
                    : "text-red-700 bg-red-50 border-red-200"
                }`}>
                  Permission Setting: Weekend entries {allowWeekendEntries ? "enabled" : "disabled"}
                </div>
                
                {user.role === "admin" && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    Effective Permission: Can log weekend hours (admin override active)
                  </div>
                )}
                
                {user.role !== "admin" && (
                  <div className={`text-xs p-2 rounded border ${
                    canLogWeekendHours 
                      ? "text-green-700 bg-green-50 border-green-200" 
                      : "text-red-700 bg-red-50 border-red-200"
                  }`}>
                    Effective Permission: {canLogWeekendHours ? "Can log weekend hours" : "Cannot log weekend hours"}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={`text-sm p-2 rounded border ${
                canLogWeekendHours 
                  ? "text-green-700 bg-green-50 border-green-200" 
                  : "text-red-700 bg-red-50 border-red-200"
              }`}>
                Weekend entries: {canLogWeekendHours ? "Enabled" : "Disabled"}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Office Day Template Management - Only show to admins */}
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Office Day Template</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDefaultTemplateDialog(true)}
                className="text-xs h-8"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit Template
              </Button>
            </div>
            
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Current Template:</div>
              {hasOfficeRequirements ? (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(officeDays)
                    .filter(([_, required]) => required)
                    .map(([day]) => (
                      <Badge key={day} variant="outline" className="text-xs">
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Badge>
                    ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No office days required - fully flexible
                </div>
              )}
            </div>
          </div>
        )}

        {/* Office Requirements Display for Non-Admins */}
        {!isAdmin && hasOfficeRequirements && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Office Days This Week</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(officeDays)
                .filter(([_, required]) => required)
                .map(([day]) => (
                  <Badge key={day} variant="outline" className="text-xs">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {isAdmin && <Separator />}

        {/* Default Schedule Reference */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Default Schedule</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {workingDays} days per week
          </div>
        </div>
      </CardContent>
      
      <DefaultOfficeDayTemplateDialog
        isOpen={showDefaultTemplateDialog}
        onClose={() => setShowDefaultTemplateDialog(false)}
        user={{...user, email: user.email || ''}}
        currentOfficeDays={undefined}
        weekStartDate={weekStartDate}
        onUpdate={handleDataUpdate}
      />

      <WeeklyScheduleOverrideDialog
        isOpen={showWeeklyOverrideDialog}
        onClose={() => setShowWeeklyOverrideDialog(false)}
        user={{...user, email: user.email || ''}}
        weekStartDate={weekStartDate}
        onUpdate={handleDataUpdate}
      />
      
    </Card>;
};

export default UnifiedUserScheduleCard;
