import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Play,
  Pause,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QueuedAssignment {
  id: string;
  incident_id: string;
  incident?: {
    incident_number: string;
    title: string;
    priority?: {
      name: string;
      color: string;
    };
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  assignment_strategy: string;
  required_skills: string[];
  preferred_assignees: string[];
  excluded_assignees: string[];
  priority_weight: number;
  current_attempts: number;
  max_attempts: number;
  failure_reason?: string;
  assigned_to?: string;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200"
};

const statusIcons = {
  pending: Clock,
  processing: RefreshCw,
  completed: CheckCircle,
  failed: XCircle
};

export function AssignmentQueueManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");

  const { data: queuedAssignments = [], isLoading, refetch } = useQuery({
    queryKey: ['assignment-queue'],
    queryFn: async () => {
      // Fetch queue and incidents in parallel, avoiding nested JOINs
      const [queueResult, incidentsResult] = await Promise.all([
        supabase
          .from('assignment_queues')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('incidents')
          .select('id, incident_number, title, priority_id')
      ]);

      if (queueResult.error) throw queueResult.error;
      if (incidentsResult.error) throw incidentsResult.error;

      // Get unique priority IDs for batch fetch
      const priorityIds = [...new Set(incidentsResult.data?.map(i => i.priority_id).filter(Boolean) || [])];
      
      const prioritiesResult = priorityIds.length > 0
        ? await supabase.from('incident_priorities').select('id, name, color').in('id', priorityIds)
        : { data: [], error: null };

      // Create lookup maps with proper typing
      const incidentsMap = new Map<string, typeof incidentsResult.data[0]>();
      (incidentsResult.data || []).forEach(i => incidentsMap.set(i.id, i));
      
      const prioritiesMap = new Map<string, { id: string; name: string; color: string }>();
      (prioritiesResult.data || []).forEach(p => prioritiesMap.set(p.id, p));

      // Combine data
      return (queueResult.data || []).map(queue => {
        const incident = incidentsMap.get(queue.incident_id);
        const priority = incident?.priority_id ? prioritiesMap.get(incident.priority_id) : null;
        
        return {
          ...queue,
          incident: incident ? {
            incident_number: incident.incident_number,
            title: incident.title,
            priority: priority || undefined
          } : undefined
        };
      }) as QueuedAssignment[];
    },
    staleTime: 15 * 1000, // 15 seconds cache
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const filteredAssignments = queuedAssignments.filter(assignment => {
    const matchesSearch = 
      assignment.incident?.incident_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.incident?.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    const matchesStrategy = strategyFilter === "all" || assignment.assignment_strategy === strategyFilter;

    return matchesSearch && matchesStatus && matchesStrategy;
  });

  const handleRetryAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assignment_queues')
        .update({ 
          status: 'pending', 
          current_attempts: 0,
          failure_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Failed to retry assignment:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assignment_queues')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons];
    return (
      <Badge className={statusColors[status as keyof typeof statusColors]} variant="outline">
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const stats = {
    pending: queuedAssignments.filter(a => a.status === 'pending').length,
    processing: queuedAssignments.filter(a => a.status === 'processing').length,
    completed: queuedAssignments.filter(a => a.status === 'completed').length,
    failed: queuedAssignments.filter(a => a.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assignment Queue</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by incident number or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                <SelectItem value="smart">Smart Assignment</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="workload_balanced">Workload Balanced</SelectItem>
                <SelectItem value="skill_based">Skill Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Queue Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Loading assignment queue...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No assignments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-mono text-sm">{assignment.incident?.incident_number}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {assignment.incident?.title}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(assignment.status)}
                        {assignment.failure_reason && (
                          <div className="text-xs text-red-600 mt-1 max-w-[150px] truncate">
                            {assignment.failure_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {assignment.assignment_strategy.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                          <span className="text-sm">{assignment.priority_weight}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {assignment.current_attempts}/{assignment.max_attempts}
                        </div>
                        {assignment.current_attempts >= assignment.max_attempts && (
                          <Badge variant="destructive" className="text-xs">Max reached</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(assignment.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {assignment.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryAssignment(assignment.id)}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}