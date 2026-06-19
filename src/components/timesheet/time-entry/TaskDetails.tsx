
import React, { useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { TimeEntryFormValues } from "./schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { IncidentSelector } from "./IncidentSelector";

interface TaskDetailsProps {
  control: Control<TimeEntryFormValues>;
  setValue: UseFormSetValue<TimeEntryFormValues>;
  watch: UseFormWatch<TimeEntryFormValues>;
  projectId?: string;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({ 
  control, 
  setValue, 
  watch,
  projectId 
}) => {
  const taskMode = watch("task_mode") || "manual";
  const selectedIncidentId = watch("incident_id");

  // Reset incident_id when switching to manual mode
  useEffect(() => {
    if (taskMode === "manual" && selectedIncidentId) {
      setValue("incident_id", undefined);
    }
  }, [taskMode, selectedIncidentId, setValue]);

  const handleIncidentSelect = (incident: { id: string; incident_number: string; title: string } | null) => {
    if (incident) {
      setValue("incident_id", incident.id);
      setValue("jira_task_id", incident.incident_number);
    } else {
      setValue("incident_id", undefined);
      setValue("jira_task_id", "");
    }
  };

  return (
    <div className="space-y-4">
      {/* Task Mode Toggle */}
      <FormField
        control={control}
        name="task_mode"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="font-medium">Task Reference</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value || "manual"}
                value={field.value || "manual"}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="task-manual" />
                  <Label htmlFor="task-manual" className="cursor-pointer font-normal">
                    Manual Entry
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="incident" id="task-incident" />
                  <Label htmlFor="task-incident" className="cursor-pointer font-normal">
                    Select Incident
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />

      {/* Conditional: Manual Task ID or Incident Selector */}
      {taskMode === "manual" ? (
        <FormField
          control={control}
          name="jira_task_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Task ID*</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., JIRA-123, TASK-001" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <IncidentSelector
          control={control}
          onSelect={handleIncidentSelect}
          selectedIncidentId={selectedIncidentId}
          projectId={projectId}
        />
      )}
      
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-medium">Notes*</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                placeholder="Add details about your work"
                rows={3}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
