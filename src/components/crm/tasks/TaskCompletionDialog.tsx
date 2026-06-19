import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskAttachmentUpload } from "./TaskAttachmentUpload";
import { useTaskAttachments } from "@/hooks/crm/useTaskAttachments";
import { useUpdateTask } from "@/hooks/crm/useTasks";
import { useToast } from "@/hooks/use-toast";
import { TimeLoggerInput, useTimeLoggerState } from "@/components/shared/TimeLoggerInput";
import { useQuickTimeEntry } from "@/hooks/useQuickTimeEntry";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TaskCompletionDialogProps {
  open: boolean;
  onClose: (completed?: boolean) => void;
  task: {
    id: string;
    title: string;
  } | null;
}

// Hook to fetch active projects for time logging
function useActiveProjects() {
  return useQuery({
    queryKey: ["active-projects-for-time-logging"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });
}

export function TaskCompletionDialog({ open, onClose, task }: TaskCompletionDialogProps) {
  const { toast } = useToast();
  const updateTask = useUpdateTask();
  const { data: attachments, isLoading: attachmentsLoading } = useTaskAttachments(task?.id);
  const { data: projects = [] } = useActiveProjects();
  const { createFromTask } = useQuickTimeEntry();
  
  const [completionNotes, setCompletionNotes] = useState("");
  const [timeLogData, setTimeLogData] = useTimeLoggerState();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  
  const hasAttachments = (attachments?.length ?? 0) > 0;
  const hasProofOfWork = hasAttachments || completionNotes.trim().length > 0;

  // Reset state when dialog opens/closes or task changes
  useEffect(() => {
    if (!open) {
      setCompletionNotes("");
      setTimeLogData({ enabled: false, mode: "duration", hours: 0, startTime: "", endTime: "" });
      setSelectedProjectId("");
    }
  }, [open, task?.id]);

  const handleComplete = async () => {
    if (!task) return;
    
    if (!hasProofOfWork) {
      toast({
        title: "Proof of work required",
        description: "Please upload at least one file OR add completion notes before marking this task as complete.",
        variant: "destructive",
      });
      return;
    }

    // Validate time logging setup
    if (timeLogData.enabled && timeLogData.hours > 0 && !selectedProjectId) {
      toast({
        title: "Project required",
        description: "Please select a project for time logging.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: { 
          status: "completed",
          completion_notes: completionNotes.trim() || null,
        },
      });
      
      // Log time if enabled
      if (timeLogData.enabled && timeLogData.hours > 0 && selectedProjectId) {
        await createFromTask.mutateAsync({
          taskId: task.id,
          taskTitle: task.title,
          hours: timeLogData.hours,
          notes: completionNotes.trim() || "Task completed",
          projectId: selectedProjectId,
          startTime: timeLogData.mode === "timeframe" ? timeLogData.startTime : undefined,
          endTime: timeLogData.mode === "timeframe" ? timeLogData.endTime : undefined,
        });
      }
      
      toast({
        title: "Task completed",
        description: timeLogData.enabled && timeLogData.hours > 0 
          ? "Task completed and time logged to your timesheet."
          : "Task has been marked as complete with proof of work.",
      });
      onClose(true); // Signal that task was completed
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Complete Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Task:</p>
            <p className="font-medium">{task.title}</p>
          </div>

          <div className="border-t pt-4">
            <TaskAttachmentUpload taskId={task.id} />
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completion-notes">Completion Notes</Label>
            <Textarea
              id="completion-notes"
              placeholder="Describe what was done to complete this task..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
            />
          </div>

          <TimeLoggerInput
            value={timeLogData}
            onChange={setTimeLogData}
            disabled={updateTask.isPending}
          />

          {timeLogData.enabled && timeLogData.hours > 0 && (
            <div className="space-y-2">
              <Label htmlFor="project-select">Log Time to Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-select">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!attachmentsLoading && !hasProofOfWork && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
              Please provide proof of completion: upload a file OR add completion notes.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={updateTask.isPending || !hasProofOfWork}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
