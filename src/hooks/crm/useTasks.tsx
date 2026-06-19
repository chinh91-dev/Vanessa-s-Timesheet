import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import type { Task, CreateTaskDTO, UpdateTaskDTO } from "@/lib/crm/types";


export const useTasks = (filters?: { assigned_to?: string; account_id?: string; deal_id?: string; meeting_id?: string }) => {
  return useQuery({
    queryKey: ['crm', 'tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          account:account_id(id, name),
          deal:deal_id(id, name),
          assignee:assigned_to(id, full_name, email)
        `)
        .order('due_date', { ascending: true });
      
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.account_id) {
        query = query.eq('account_id', filters.account_id);
      }
      if (filters?.deal_id) {
        query = query.eq('deal_id', filters.deal_id);
      }
      if (filters?.meeting_id) {
        query = query.eq('meeting_id', filters.meeting_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: CreateTaskDTO) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select(`
          *,
          account:account_id(id, name)
        `)
        .single();
      
      if (error) throw error;
      
      
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "task_created",
        entityName: `Task: ${data.title}`,
        description: `Created new task${data.due_date ? ` due ${data.due_date}` : ''}`,
        details: {
          task_id: data.id,
          title: data.title,
          priority: data.priority,
          status: data.status,
          due_date: data.due_date,
          deal_id: data.deal_id,
          account_id: data.account_id,
          meeting_id: (data as any).meeting_id,
        },
      });
      
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTaskDTO }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Get current task to check for status, assignee change, and auto-generated status
      const { data: currentTask } = await supabase
        .from('tasks')
        .select(`
          status, title, assigned_to, due_date, is_auto_generated,
          account:account_id(id, name)
        `)
        .eq('id', id)
        .single();
      
      // Check if trying to update due_date on auto-generated task
      if (updates.due_date && currentTask?.is_auto_generated && currentTask.due_date !== updates.due_date) {
        // Verify user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUserId)
          .single();
        
        if (roleData?.role !== 'admin') {
          throw new Error('Only admins can extend due dates on auto-generated tasks');
        }
        
        // Log the extension by adding extension tracking fields
        updates = {
          ...updates,
          due_date_extended_by: currentUserId,
          due_date_extended_at: new Date().toISOString(),
        } as UpdateTaskDTO;
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          account:account_id(id, name)
        `)
        .single();
      
      if (error) throw error;
      
      const wasCompleted = currentTask?.status !== 'completed' && updates.status === 'completed';
      const wasReassigned = updates.assigned_to && 
                           updates.assigned_to !== currentTask?.assigned_to &&
                           updates.assigned_to !== currentUserId;
      const wasDueDateExtended = updates.due_date && currentTask?.is_auto_generated && currentTask.due_date !== updates.due_date;
      
      
      return { task: data as Task, wasCompleted, wasDueDateExtended };
    },
    onSuccess: ({ task, wasCompleted, wasDueDateExtended }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] });
      
      // Determine the action for audit log
      let action = "task_updated";
      let description = "Updated task details";
      
      if (wasCompleted) {
        action = "task_completed";
        description = "Completed task";
      } else if (wasDueDateExtended) {
        action = "task_due_date_extended";
        description = `Extended task due date to ${task.due_date}`;
      }
      
      // Log audit event
      logCRMAuditEvent({
        action,
        entityName: `Task: ${task.title}`,
        description,
        details: {
          task_id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          was_completed: wasCompleted,
          was_due_date_extended: wasDueDateExtended,
          new_due_date: wasDueDateExtended ? task.due_date : undefined,
        },
      });
      
      toast({
        title: "Success",
        description: wasDueDateExtended ? "Task due date extended" : "Task updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get task info before deleting for audit log
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, task };
    },
    onSuccess: ({ id, task }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] });
      
      // Log audit event
      logCRMAuditEvent({
        action: "task_deleted",
        entityName: `Task: ${task?.title || 'Unknown'}`,
        description: `Deleted task`,
        details: {
          task_id: id,
          title: task?.title,
        },
      });
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCompleteTasksByDealId = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ dealId, completionNotes }: { dealId: string; completionNotes?: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completion_notes: completionNotes || null,
        })
        .eq('deal_id', dealId)
        .in('status', ['pending', 'in_progress']);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] });
    },
  });
};
