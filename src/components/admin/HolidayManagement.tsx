
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus, Settings, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatDateDisplay } from "@/lib/date-utils";
import { eachDayOfInterval, parseISO, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import HolidayPermissionMatrix from "./HolidayPermissionMatrix";
import { attachUserRoles } from "@/lib/user-with-role-utils";
import type { UserWithRole } from "@/lib/user-service";

interface Holiday {
  id: string;
  date: string;
  name: string;
  state: string;
  year: number;
}

interface UserHolidayPermission extends UserWithRole {
  allow_holiday_entries: boolean;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

const HolidayManagement: React.FC = () => {
  const [newHolidayOpen, setNewHolidayOpen] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayStartDate, setNewHolidayStartDate] = useState("");
  const [newHolidayEndDate, setNewHolidayEndDate] = useState("");
  const [newHolidayDescription, setNewHolidayDescription] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch all holidays from current year and next year
  const { data: holidays, isLoading: holidaysLoading, error: holidaysError } = useQuery({
    queryKey: ["admin-holidays"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      console.log(`Fetching holidays for years ${currentYear} and ${nextYear}`);
      
      const { data, error } = await supabase
        .from("public_holidays")
        .select("*")
        .in("year", [currentYear, nextYear])
        .eq("state", "VIC")
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching holidays:", error);
        throw error;
      }
      
      console.log("Fetched holidays:", data);
      return data as Holiday[];
    },
  });

  // Fetch user holiday permissions
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["user-holiday-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules")
        .select(`
          id,
          user_id,
          allow_holiday_entries,
          profiles!work_schedules_user_id_fkey (
            full_name,
            email
          )
        `)
        .order("profiles(full_name)", { ascending: true });

      if (error) throw error;
      
      const mappedData = data?.map(item => ({
        id: item.user_id,
        user_id: item.user_id,
        allow_holiday_entries: item.allow_holiday_entries,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      })) || [];

      // Fetch roles from user_roles table using utility
      const dataWithRoles = await attachUserRoles(mappedData);

      // Add back the additional fields
      return dataWithRoles.map((user, index) => ({
        ...user,
        allow_holiday_entries: mappedData[index].allow_holiday_entries,
        profiles: mappedData[index].profiles,
      })) as UserHolidayPermission[];
    },
  });

  // Add custom holiday mutation
  const addHolidayMutation = useMutation({
    mutationFn: async (holidayData: { name: string; startDate: string; endDate: string; description?: string }) => {
      // Generate array of dates from startDate to endDate
      const dates = eachDayOfInterval({
        start: parseISO(holidayData.startDate),
        end: parseISO(holidayData.endDate)
      });
      
      const dateStrings = dates.map(date => format(date, 'yyyy-MM-dd'));
      
      // Check for existing holidays on these dates
      const { data: existingHolidays } = await supabase
        .from("public_holidays")
        .select("date")
        .in("date", dateStrings)
        .eq("state", "VIC");
      
      const existingDates = new Set(existingHolidays?.map(h => h.date) || []);
      
      // Filter out dates that already have holidays
      const newDates = dates.filter(date => !existingDates.has(format(date, 'yyyy-MM-dd')));
      
      if (newDates.length === 0) {
        throw new Error("All selected dates already have holidays assigned.");
      }
      
      // Create holiday entries for new days only
      const entries = newDates.map(date => ({
        name: holidayData.name,
        date: format(date, 'yyyy-MM-dd'),
        state: "VIC",
        year: date.getFullYear(),
      }));
      
      const { data, error } = await supabase
        .from("public_holidays")
        .insert(entries)
        .select();

      if (error) throw error;
      return { data, count: entries.length, skipped: existingDates.size };
    },
    onSuccess: (result) => {
      const skippedMsg = result.skipped > 0 ? ` (${result.skipped} date(s) skipped - already exist)` : "";
      toast({
        title: "Holiday Added",
        description: `Custom holiday has been added for ${result.count} day(s).${skippedMsg}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-holidays"] });
      setNewHolidayOpen(false);
      setNewHolidayName("");
      setNewHolidayStartDate("");
      setNewHolidayEndDate("");
      setNewHolidayDescription("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add holiday. " + error.message,
        variant: "destructive",
      });
    },
  });

  // Update user permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, allowHolidayEntries }: { userId: string; allowHolidayEntries: boolean }) => {
      const { error } = await supabase
        .from("work_schedules")
        .update({ allow_holiday_entries: allowHolidayEntries })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Permission Updated",
        description: "User holiday permission has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["user-holiday-permissions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update permission. " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddHoliday = () => {
    if (!newHolidayName.trim() || !newHolidayStartDate || !newHolidayEndDate) {
      toast({
        title: "Validation Error",
        description: "Please provide holiday name, from date, and to date.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(newHolidayEndDate) < new Date(newHolidayStartDate)) {
      toast({
        title: "Validation Error",
        description: "To date must be on or after from date.",
        variant: "destructive",
      });
      return;
    }

    addHolidayMutation.mutate({
      name: newHolidayName.trim(),
      startDate: newHolidayStartDate,
      endDate: newHolidayEndDate,
      description: newHolidayDescription.trim() || undefined,
    });
  };

  const handlePermissionToggle = (userId: string, currentValue: boolean) => {
    updatePermissionMutation.mutate({
      userId,
      allowHolidayEntries: !currentValue,
    });
  };

  const currentYear = new Date().getFullYear();
  const allHolidays = holidays || [];
  const upcomingHolidays = allHolidays.filter(h => new Date(h.date) >= new Date()).slice(0, 15);
  const currentYearHolidays = allHolidays.filter(h => h.year === currentYear);
  const nextYearHolidays = allHolidays.filter(h => h.year === currentYear + 1);

  if (holidaysError) {
    console.error("Holiday fetch error:", holidaysError);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Holiday Management
          </h2>
          <p className="text-muted-foreground">
            Manage public holidays and configure granular user permissions
          </p>
        </div>
        
        <Dialog open={newHolidayOpen} onOpenChange={setNewHolidayOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Holiday</DialogTitle>
              <DialogDescription>
                Add a custom company holiday that will be applied to all users.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="holiday-name">Holiday Name</Label>
                <Input
                  id="holiday-name"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="e.g., Company Retreat Day"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="holiday-start-date">From Date</Label>
                  <Input
                    id="holiday-start-date"
                    type="date"
                    value={newHolidayStartDate}
                    onChange={(e) => setNewHolidayStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="holiday-end-date">To Date</Label>
                  <Input
                    id="holiday-end-date"
                    type="date"
                    value={newHolidayEndDate}
                    onChange={(e) => setNewHolidayEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="holiday-description">Description (Optional)</Label>
                <Textarea
                  id="holiday-description"
                  value={newHolidayDescription}
                  onChange={(e) => setNewHolidayDescription(e.target.value)}
                  placeholder="Additional details about this holiday..."
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setNewHolidayOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddHoliday}
                disabled={addHolidayMutation.isPending}
              >
                {addHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">General Permissions</TabsTrigger>
          <TabsTrigger value="specific">Specific Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Holidays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingHolidays.length}</div>
                <p className="text-xs text-muted-foreground">From today onwards</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{currentYear} Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentYearHolidays.length}</div>
                <p className="text-xs text-muted-foreground">Current year holidays</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{currentYear + 1} Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{nextYearHolidays.length}</div>
                <p className="text-xs text-muted-foreground">Next year holidays</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Users with Holiday Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userPermissions?.filter(u => u.allow_holiday_entries).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Out of {userPermissions?.length || 0} total users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* All Holidays List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Victoria Public Holidays ({currentYear} - {currentYear + 1})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {holidaysLoading ? (
                <div className="text-center py-4">Loading holidays...</div>
              ) : allHolidays.length > 0 ? (
                <div className="space-y-2">
                  {allHolidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{holiday.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateDisplay(new Date(holiday.date))} • {holiday.year}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {holiday.state}
                        </Badge>
                        {new Date(holiday.date) < new Date() && (
                          <Badge variant="outline">Past</Badge>
                        )}
                        {new Date(holiday.date) >= new Date() && (
                          <Badge variant="default">Upcoming</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No holidays found</h3>
                  <p className="text-muted-foreground mb-4">
                    No Victoria public holidays found for {currentYear} - {currentYear + 1}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          {/* User Holiday Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                General Holiday Permissions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Control the default holiday entry permissions for each user. These can be overridden on a per-holiday basis.
              </p>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="text-center py-4">Loading user permissions...</div>
              ) : userPermissions && userPermissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Holiday Entries Allowed</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userPermissions.map((user) => {
                      const isAdmin = user.role === 'admin';
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {user.profiles?.full_name || "No name"}
                              </span>
                              {isAdmin && (
                                <Badge variant="default" className="text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.profiles?.email || "No email"}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Badge variant="default" className="bg-emerald-500">
                                Always Allowed (Admin Override)
                              </Badge>
                            ) : (
                              <Badge variant={user.allow_holiday_entries ? "default" : "secondary"}>
                                {user.allow_holiday_entries ? "Allowed" : "Blocked"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <div className="text-sm text-muted-foreground">
                                Admin users always have holiday access
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={user.allow_holiday_entries}
                                  onCheckedChange={() => handlePermissionToggle(user.id, user.allow_holiday_entries)}
                                  disabled={updatePermissionMutation.isPending}
                                />
                                <Label className="text-sm">
                                  {user.allow_holiday_entries ? "Allow" : "Block"}
                                </Label>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specific">
          <HolidayPermissionMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HolidayManagement;
