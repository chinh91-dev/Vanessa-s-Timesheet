
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";

interface HolidayPermissionMatrix {
  holiday_id: string;
  holiday_name: string;
  holiday_date: string;
  user_id: string;
  user_name: string;
  user_email: string;
  specific_permission: boolean | null;
  general_permission: boolean;
  effective_permission: boolean;
  permission_source: string;
}

interface GroupedHoliday {
  name: string;
  holidayIds: string[];
  startDate: string;
  endDate: string;
  displayLabel: string;
}

const HolidayPermissionMatrix: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedHolidayName, setSelectedHolidayName] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch holiday permission matrix
  const { data: permissionMatrix, isLoading } = useQuery({
    queryKey: ["holiday-permission-matrix", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_holiday_permission_matrix', {
        p_year: selectedYear
      });

      if (error) throw error;
      return data as HolidayPermissionMatrix[];
    },
  });

  // Get unique holidays grouped by name, filtering out past holidays
  const groupedHolidays: GroupedHoliday[] = React.useMemo(() => {
    if (!permissionMatrix) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group holidays by name
    const holidayGroups = new Map<string, { ids: string[]; dates: string[] }>();
    
    permissionMatrix.forEach(item => {
      const holidayDate = new Date(item.holiday_date);
      // Only include holidays that are today or in the future
      if (holidayDate >= today) {
        const existing = holidayGroups.get(item.holiday_name);
        if (existing) {
          if (!existing.ids.includes(item.holiday_id)) {
            existing.ids.push(item.holiday_id);
            existing.dates.push(item.holiday_date);
          }
        } else {
          holidayGroups.set(item.holiday_name, {
            ids: [item.holiday_id],
            dates: [item.holiday_date]
          });
        }
      }
    });
    
    // Convert to GroupedHoliday array
    const grouped: GroupedHoliday[] = [];
    holidayGroups.forEach((value, name) => {
      const sortedDates = value.dates.sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];
      
      const startFormatted = format(parseISO(startDate), 'dd/MM/yyyy');
      const endFormatted = format(parseISO(endDate), 'dd/MM/yyyy');
      
      const displayLabel = startDate === endDate 
        ? `${name} - ${startFormatted}`
        : `${name} - ${startFormatted} to ${endFormatted}`;
      
      grouped.push({
        name,
        holidayIds: value.ids,
        startDate,
        endDate,
        displayLabel
      });
    });
    
    // Sort by start date
    return grouped.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [permissionMatrix]);

  // Get users for selected holiday group (aggregate across all dates)
  const selectedHolidayUsers = React.useMemo(() => {
    if (!permissionMatrix || !selectedHolidayName) return [];
    
    const selectedGroup = groupedHolidays.find(h => h.name === selectedHolidayName);
    if (!selectedGroup) return [];
    
    // Get unique users with their permissions for the first holiday in the group
    // (permissions should be consistent across dates in a range)
    const firstHolidayId = selectedGroup.holidayIds[0];
    return permissionMatrix.filter(item => item.holiday_id === firstHolidayId);
  }, [permissionMatrix, selectedHolidayName, groupedHolidays]);

  // Set first holiday as default when holidays load
  React.useEffect(() => {
    if (groupedHolidays.length > 0 && !selectedHolidayName) {
      setSelectedHolidayName(groupedHolidays[0].name);
    }
  }, [groupedHolidays, selectedHolidayName]);

  // Clear selected holiday if it's no longer available
  React.useEffect(() => {
    if (selectedHolidayName && !groupedHolidays.find(h => h.name === selectedHolidayName)) {
      setSelectedHolidayName(groupedHolidays.length > 0 ? groupedHolidays[0].name : "");
    }
  }, [groupedHolidays, selectedHolidayName]);

  // Toggle specific permission mutation - applies to ALL holidays in the group
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ userId, holidayIds, currentPermission }: { 
      userId: string; 
      holidayIds: string[]; 
      currentPermission: boolean | null;
    }) => {
      // Apply permission to all holiday IDs in the group
      for (const holidayId of holidayIds) {
        if (currentPermission === null) {
          // Create new specific permission
          const { error } = await supabase
            .from("user_holiday_permissions")
            .upsert({
              user_id: userId,
              holiday_id: holidayId,
              is_allowed: true,
            }, { onConflict: 'user_id,holiday_id' });
          if (error) throw error;
        } else {
          // Update existing specific permission
          const { error } = await supabase
            .from("user_holiday_permissions")
            .upsert({
              user_id: userId,
              holiday_id: holidayId,
              is_allowed: !currentPermission
            }, { onConflict: 'user_id,holiday_id' });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Permission Updated",
        description: "Holiday permission has been updated for all dates in the range.",
      });
      queryClient.invalidateQueries({ queryKey: ["holiday-permission-matrix"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update permission. " + error.message,
        variant: "destructive",
      });
    },
  });

  // Remove specific permission mutation - applies to ALL holidays in the group
  const removePermissionMutation = useMutation({
    mutationFn: async ({ userId, holidayIds }: { userId: string; holidayIds: string[] }) => {
      const { error } = await supabase
        .from("user_holiday_permissions")
        .delete()
        .eq("user_id", userId)
        .in("holiday_id", holidayIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Permission Removed",
        description: "Specific holiday permission has been removed for all dates in the range.",
      });
      queryClient.invalidateQueries({ queryKey: ["holiday-permission-matrix"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove permission. " + error.message,
        variant: "destructive",
      });
    },
  });

  const getPermissionIcon = (source: string, effective: boolean) => {
    if (source === 'admin_override') {
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
    if (effective) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getPermissionBadge = (source: string, effective: boolean) => {
    if (source === 'admin_override') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Admin Override</Badge>;
    }
    if (source === 'specific_permission') {
      return effective ? 
        <Badge variant="default" className="bg-green-100 text-green-800">Specific Allow</Badge> :
        <Badge variant="destructive" className="bg-red-100 text-red-800">Specific Block</Badge>;
    }
    return effective ? 
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">General Allow</Badge> :
      <Badge variant="outline" className="bg-gray-50 text-gray-600">General Block</Badge>;
  };

  const handleTogglePermission = (userId: string, currentPermission: boolean | null) => {
    const selectedGroup = groupedHolidays.find(h => h.name === selectedHolidayName);
    if (!selectedGroup) return;
    
    togglePermissionMutation.mutate({ 
      userId, 
      holidayIds: selectedGroup.holidayIds, 
      currentPermission 
    });
  };

  const handleRemovePermission = (userId: string) => {
    const selectedGroup = groupedHolidays.find(h => h.name === selectedHolidayName);
    if (!selectedGroup) return;
    
    removePermissionMutation.mutate({ userId, holidayIds: selectedGroup.holidayIds });
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading permission matrix...</div>;
  }

  const selectedGroup = groupedHolidays.find(h => h.name === selectedHolidayName);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Holiday Permission Matrix ({selectedYear})
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="year-select">Year:</Label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value, 10))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="holiday-select">Holiday:</Label>
            <Select value={selectedHolidayName} onValueChange={setSelectedHolidayName}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select a holiday" />
              </SelectTrigger>
              <SelectContent>
                {groupedHolidays.map((holiday) => (
                  <SelectItem key={holiday.name} value={holiday.name}>
                    {holiday.displayLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="matrix">
          <TabsList>
            <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="matrix" className="space-y-6">
            {selectedGroup && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{selectedGroup.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedGroup.startDate === selectedGroup.endDate 
                        ? format(parseISO(selectedGroup.startDate), 'dd/MM/yyyy')
                        : `${format(parseISO(selectedGroup.startDate), 'dd/MM/yyyy')} to ${format(parseISO(selectedGroup.endDate), 'dd/MM/yyyy')}`
                      }
                      {selectedGroup.holidayIds.length > 1 && (
                        <span className="ml-2 text-xs">({selectedGroup.holidayIds.length} days)</span>
                      )}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedHolidayUsers.length} users configured
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedHolidayUsers.map((user: HolidayPermissionMatrix) => (
                      <TableRow key={`${user.user_id}-${selectedGroup.name}`}>
                        <TableCell className="font-medium">
                          {user.user_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.user_email}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPermissionIcon(user.permission_source, user.effective_permission)}
                            {user.effective_permission ? 'Allowed' : 'Blocked'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPermissionBadge(user.permission_source, user.effective_permission)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.permission_source !== 'admin_override' && (
                              <>
                                <Switch
                                  checked={user.specific_permission ?? user.general_permission}
                                  onCheckedChange={() => handleTogglePermission(
                                    user.user_id, 
                                    user.specific_permission
                                  )}
                                  disabled={togglePermissionMutation.isPending}
                                />
                                {user.specific_permission !== null && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemovePermission(user.user_id)}
                                    disabled={removePermissionMutation.isPending}
                                  >
                                    Reset
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {groupedHolidays.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming holidays found for {selectedYear}. All holidays for this year may have already passed.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="summary">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {permissionMatrix?.filter(p => p.specific_permission !== null).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Specific overrides set</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Allowed Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {permissionMatrix?.filter(p => p.effective_permission).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Can work on holidays</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Admin Overrides</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {permissionMatrix?.filter(p => p.permission_source === 'admin_override').length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Admin users</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default HolidayPermissionMatrix;
