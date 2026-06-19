import { useState } from "react";
import { Plus, Search, CheckCircle2, Circle, Clock, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks, useDeleteTask } from "@/hooks/crm/useTasks";
import { formatDate } from "@/lib/crm/formatting";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/crm/constants";
import { canDeleteEntity, canCompleteTask } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/crm/tasks/TaskDialog";
import { TaskCompletionDialog } from "@/components/crm/tasks/TaskCompletionDialog";
import { GenericDeleteDialog } from "@/components/common/dialogs";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/lib/crm/types";

export default function TasksPage() {
  const { user, userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("mine"); // Default to "mine"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<{ id: string; title: string } | null>(null);

  // Fetch CRM users for staff filter
  const { data: crmUsers } = useQuery({
    queryKey: ['crm-users-all'],
    queryFn: async () => {
      const assignableRoles = ['admin', 'sale_manager', 'sale_user'];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', assignableRoles);

      if (rolesError) throw rolesError;
      if (!rolesData || rolesData.length === 0) return [];

      const userIds = [...new Set(rolesData.map(r => r.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;
      return profilesData || [];
    },
  });
  
  // Filter based on staff selection
  const taskFilters = staffFilter === "mine" 
    ? { assigned_to: user?.id }
    : staffFilter === "all"
      ? {}
      : { assigned_to: staffFilter };
  
  const { data: tasks, isLoading } = useTasks(taskFilters);
  const deleteTask = useDeleteTask();

  const handleDeleteClick = () => {
    if (selectedTask) {
      setTaskToDelete(selectedTask);
      setDialogOpen(false);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async (task: Task) => {
    await deleteTask.mutateAsync(task.id);
  };

  const handleCompleteClick = (e: React.MouseEvent, task: { id: string; title: string }) => {
    e.stopPropagation();
    setTaskToComplete(task);
    setCompletionDialogOpen(true);
  };

  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.account?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle2;
      case "in_progress": return Clock;
      default: return Circle;
    }
  };

  // Get title based on filter
  const getPageTitle = () => {
    if (staffFilter === "mine") return "My Tasks";
    if (staffFilter === "all") return "All Tasks";
    const selectedUser = crmUsers?.find(u => u.id === staffFilter);
    return selectedUser ? `${selectedUser.full_name}'s Tasks` : "Tasks";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{getPageTitle()}</h1>
            <p className="text-muted-foreground mt-1">
              {staffFilter === "mine" ? "Track your assigned tasks" : "View team tasks"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Staff Filter */}
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="w-[180px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">My Tasks</SelectItem>
                <SelectItem value="all">All Staff</SelectItem>
                {crmUsers?.map((crmUser) => (
                  <SelectItem key={crmUser.id} value={crmUser.id}>
                    {crmUser.full_name || crmUser.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Status</option>
              {Object.entries(TASK_STATUSES).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Priority</option>
              {Object.entries(TASK_PRIORITIES).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredTasks?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No tasks found</p>
              <p className="text-sm text-muted-foreground">
                {staffFilter === "mine" 
                  ? "You're all caught up! Tasks are auto-created when moving deals or scheduling meetings."
                  : "No tasks match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const StatusIcon = getStatusIcon(task.status);
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
              const isCompleted = task.status === "completed";
              
              return (
                <Card 
                  key={task.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedTask(task); setDialogOpen(true); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600" />
                      ) : canCompleteTask(userRole) ? (
                        <button
                          onClick={(e) => handleCompleteClick(e, { id: task.id, title: task.title })}
                          className="group"
                          title="Click to complete task"
                        >
                          <Circle className="h-5 w-5 mt-0.5 text-muted-foreground group-hover:text-green-600 group-hover:fill-green-100 transition-colors" />
                        </button>
                      ) : (
                        <Circle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {task.account && (
                                <p className="text-sm text-muted-foreground">
                                  {task.account.name}
                                </p>
                              )}
                              {staffFilter !== "mine" && (task as any).assignee && (
                                <Badge variant="outline" className="text-xs">
                                  {(task as any).assignee.full_name || (task as any).assignee.email}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge 
                              variant="secondary"
                              style={{ 
                                backgroundColor: TASK_PRIORITIES[task.priority]?.color,
                                color: "white"
                              }}
                            >
                              {TASK_PRIORITIES[task.priority]?.label || task.priority}
                            </Badge>
                            {task.due_date && (
                              <span className={`text-xs ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                Due: {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedTask(undefined); }}
        task={selectedTask}
        onDelete={canDeleteEntity(userRole) ? handleDeleteClick : undefined}
      />

      <TaskCompletionDialog
        open={completionDialogOpen}
        onClose={() => { setCompletionDialogOpen(false); setTaskToComplete(null); }}
        task={taskToComplete}
      />

      {taskToDelete && (
        <GenericDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entity={taskToDelete}
          entityName="Task"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
