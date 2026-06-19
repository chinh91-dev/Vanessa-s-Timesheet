import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTasks } from "@/hooks/crm/useTasks";
import type { TaskPriority, TaskStatus } from "@/lib/crm/types";

interface MeetingTasksSectionProps {
  meetingId: string;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-destructive/20 text-destructive",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const MeetingTasksSection: React.FC<MeetingTasksSectionProps> = ({ meetingId }) => {
  const { data: tasks = [], isLoading } = useTasks({ meeting_id: meetingId });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Tasks
        </h4>
      </div>

      {/* Tasks list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-12 bg-muted rounded" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tasks associated with this meeting.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/20"
            >
              <div className="mt-0.5">
                {task.status === "completed" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    task.status === "completed" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(task.due_date), "d MMM yyyy")}
                    </span>
                  )}
                  <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className={STATUS_COLORS[task.status]}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingTasksSection;
