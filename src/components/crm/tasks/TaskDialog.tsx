import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/crm/constants";
import type { Task } from "@/lib/crm/types";
import { Trash2, Calendar, User, Building2, FileText, Clock } from "lucide-react";
import { TaskAttachmentUpload } from "./TaskAttachmentUpload";
import { TaskNoteSection } from "./TaskNoteSection";
import { format } from "date-fns";

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  onDelete?: () => void;
}

export function TaskDialog({ open, onClose, task, onDelete }: TaskDialogProps) {
  const { user } = useAuth();
  const isViewMode = !!task; // If task exists, we're in view-only mode

  // Fetch user details for task
  const { data: assignee } = useQuery({
    queryKey: ['profile', task?.assigned_to],
    queryFn: async () => {
      if (!task?.assigned_to) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', task.assigned_to)
        .single();
      return data;
    },
    enabled: open && !!task?.assigned_to,
  });

  // Fetch account details if linked
  const { data: account } = useQuery({
    queryKey: ['account', task?.account_id],
    queryFn: async () => {
      if (!task?.account_id) return null;
      const { data } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('id', task.account_id)
        .single();
      return data;
    },
    enabled: open && !!task?.account_id,
  });

  // Fetch deal details if linked
  const { data: deal } = useQuery({
    queryKey: ['deal', task?.deal_id],
    queryFn: async () => {
      if (!task?.deal_id) return null;
      const { data } = await supabase
        .from('deals')
        .select('id, name')
        .eq('id', task.deal_id)
        .single();
      return data;
    },
    enabled: open && !!task?.deal_id,
  });

  const handleClose = () => {
    onClose();
  };

  // View mode - display task details as read-only
  if (isViewMode && task) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
    const statusConfig = TASK_STATUSES[task.status];
    const priorityConfig = TASK_PRIORITIES[task.priority];

    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3">
              <div className="flex-1">
                <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                  {task.title}
                </span>
              </div>
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: statusConfig?.color || undefined,
                  color: "white",
                }}
              >
                {statusConfig?.label || task.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task details grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Priority</label>
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: priorityConfig?.color || undefined,
                    color: "white",
                  }}
                >
                  {priorityConfig?.label || task.priority}
                </Badge>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className={isOverdue ? "text-destructive font-semibold" : ""}>
                    {task.due_date ? format(new Date(task.due_date), "PPP") : "No due date"}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">Overdue</Badge>
                  )}
                </div>
              </div>

              {/* Assigned To */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Assigned To</label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{assignee?.full_name || assignee?.email || "Unassigned"}</span>
                </div>
              </div>

              {/* Account */}
              {account && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Account</label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{account.name}</span>
                  </div>
                </div>
              )}

              {/* Deal */}
              {deal && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Deal</label>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.name}</span>
                  </div>
                </div>
              )}

              {/* Created */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Created</label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(task.created_at), "PPP")}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Description</label>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                  {task.description}
                </p>
              </div>
            )}

            {/* Completion notes if completed */}
            {task.status === "completed" && task.completion_notes && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Completion Notes</label>
                <p className="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  {task.completion_notes}
                </p>
              </div>
            )}

            {/* Attachments section */}
            <Separator />
            <TaskAttachmentUpload taskId={task.id} />

            {/* Notes section */}
            <Separator />
            <TaskNoteSection taskId={task.id} />
          </div>

          <div className="flex justify-between gap-2 pt-4">
            {onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Create mode is no longer available from this dialog
  // Tasks are auto-created only
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Task Information</DialogTitle>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          <p>Tasks are automatically created when:</p>
          <ul className="mt-4 space-y-2 text-sm text-left list-disc list-inside">
            <li>Moving deals between pipeline stages</li>
            <li>Creating meetings</li>
          </ul>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
