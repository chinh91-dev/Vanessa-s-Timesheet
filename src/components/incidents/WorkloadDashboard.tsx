import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Activity, AlertTriangle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkloadMetric {
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  current_incident_count: number;
  high_priority_count: number;
  overdue_count: number;
  avg_resolution_hours: number;
  capacity_percentage: number;
  is_available: boolean;
  calculated_at: string;
}

export function WorkloadDashboard() {
  const { data: workloadData, isLoading, error } = useQuery({
    queryKey: ['workload-dashboard'],
    queryFn: async () => {
      // Fetch profiles, roles (excluding customers), and workload metrics in parallel
      const [profilesResult, rolesResult, workloadResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('is_active', true),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .neq('role', 'customer'), // Exclude customers
        supabase
          .from('workload_metrics')
          .select('*')
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (workloadResult.error) throw workloadResult.error;

      // Create lookup maps for O(1) access
      const rolesMap = new Map(rolesResult.data?.map(r => [r.user_id, r.role]) || []);
      const workloadMap = new Map(workloadResult.data?.map(w => [w.user_id, w]) || []);

      // Get set of non-customer user IDs
      const nonCustomerUserIds = new Set(rolesResult.data?.map(r => r.user_id) || []);

      // Build user list from profiles, filtering to only non-customer users
      const users = (profilesResult.data || [])
        .filter(profile => nonCustomerUserIds.has(profile.id))
        .map(profile => {
          const role = rolesMap.get(profile.id) || 'employee';
          const metric = workloadMap.get(profile.id);
          
          return {
            user_id: profile.id,
            user_name: profile.full_name || profile.email || 'Unknown User',
            user_email: profile.email || '',
            role: role,
            current_incident_count: metric?.current_incident_count ?? 0,
            high_priority_count: metric?.high_priority_count ?? 0,
            overdue_count: metric?.overdue_count ?? 0,
            avg_resolution_hours: metric?.avg_resolution_hours ?? 0,
            capacity_percentage: metric?.capacity_percentage ?? 0,
            is_available: metric?.is_available ?? true,
            calculated_at: metric?.calculated_at ?? new Date().toISOString()
          };
        }) as WorkloadMetric[];

      // Sort by incident count (descending)
      return users.sort((a, b) => b.current_incident_count - a.current_incident_count);
    },
    staleTime: 30 * 1000, // 30 seconds cache
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getCapacityVariant = (percentage: number) => {
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "secondary";
    return "default";
  };

  const totalIncidents = workloadData?.reduce((sum, user) => sum + user.current_incident_count, 0) || 0;
  const totalHighPriority = workloadData?.reduce((sum, user) => sum + user.high_priority_count, 0) || 0;
  const totalOverdue = workloadData?.reduce((sum, user) => sum + user.overdue_count, 0) || 0;
  const availableUsers = workloadData?.filter(user => user.is_available).length || 0;
  const avgResolutionTime = workloadData?.length 
    ? workloadData.reduce((sum, user) => sum + user.avg_resolution_hours, 0) / workloadData.length 
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load workload data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                <div className="text-2xl font-bold">{totalIncidents}</div>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <div className="text-2xl font-bold text-red-600">{totalHighPriority}</div>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-500 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <div className="text-2xl font-bold text-orange-600">{totalOverdue}</div>
              </div>
              <Clock className="h-4 w-4 text-orange-500 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Users</p>
                <div className="text-2xl font-bold text-green-600">{availableUsers}</div>
              </div>
              <Users className="h-4 w-4 text-green-500 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <div className="text-2xl font-bold">{avgResolutionTime.toFixed(2)}h</div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Workload Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Workload Distribution
          </CardTitle>
          <CardDescription>
            Current workload and capacity for all team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workloadData?.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(user.user_name)}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="font-semibold">{user.user_name}</div>
                    <div className="text-sm text-muted-foreground">{user.user_email}</div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Incident Counts */}
                  <div className="text-center">
                    <div className="text-lg font-bold">{user.current_incident_count}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{user.high_priority_count}</div>
                    <div className="text-xs text-muted-foreground">High Priority</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{user.overdue_count}</div>
                    <div className="text-xs text-muted-foreground">Overdue</div>
                  </div>

                  {/* Capacity */}
                  <div className="w-32">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Capacity</span>
                      <span className={`text-xs font-medium ${getCapacityColor(user.capacity_percentage)}`}>
                        {user.capacity_percentage}%
                      </span>
                    </div>
                    <Progress value={user.capacity_percentage} className="h-2" />
                  </div>

                  {/* Average Resolution */}
                  <div className="text-center">
                    <div className="text-lg font-bold">{user.avg_resolution_hours.toFixed(2)}h</div>
                    <div className="text-xs text-muted-foreground">Avg Resolution</div>
                  </div>

                  {/* Availability Status */}
                  <div className="text-center">
                    <Badge variant={user.is_available ? "default" : "secondary"}>
                      {user.is_available ? "Available" : "Busy"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!workloadData || workloadData.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>No workload data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}