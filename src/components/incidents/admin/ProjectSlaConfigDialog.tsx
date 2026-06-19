import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useIncidentPriorities } from "@/hooks/useIncidents";
import { useCreateProjectSlaConfig, useUpdateProjectSlaConfig } from "@/hooks/useProjectAdvanced";
import type { ProjectSlaConfig } from "@/types/project-types";

interface ProjectSlaConfigDialogProps {
  projectId: string;
  config?: ProjectSlaConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  priority_id: string;
  response_sla_hours: number;
  resolution_sla_hours: number;
  escalation_hours: number;
  business_hours_only: boolean;
}

export function ProjectSlaConfigDialog({
  projectId,
  config,
  open,
  onOpenChange,
  onSuccess
}: ProjectSlaConfigDialogProps) {
  const { data: priorities } = useIncidentPriorities();
  const createConfig = useCreateProjectSlaConfig();
  const updateConfig = useUpdateProjectSlaConfig();

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      priority_id: config?.priority_id || "",
      response_sla_hours: config?.response_sla_hours || 4,
      resolution_sla_hours: config?.resolution_sla_hours || 24,
      escalation_hours: config?.escalation_hours || 0,
      business_hours_only: config?.business_hours_only ?? true,
    }
  });

  React.useEffect(() => {
    if (open) {
      reset({
        priority_id: config?.priority_id || "",
        response_sla_hours: config?.response_sla_hours || 4,
        resolution_sla_hours: config?.resolution_sla_hours || 24,
        escalation_hours: config?.escalation_hours || 0,
        business_hours_only: config?.business_hours_only ?? true,
      });
    }
  }, [open, config, reset]);

  const priorityId = watch("priority_id");
  const businessHoursOnly = watch("business_hours_only");

  const onSubmit = async (data: FormData) => {
    try {
      if (config?.id) {
        await updateConfig.mutateAsync({
          id: config.id,
          updates: {
            priority_id: data.priority_id,
            response_sla_hours: data.response_sla_hours,
            resolution_sla_hours: data.resolution_sla_hours,
            escalation_hours: data.escalation_hours || undefined,
            business_hours_only: data.business_hours_only,
          }
        });
      } else {
        await createConfig.mutateAsync({
          project_id: projectId,
          priority_id: data.priority_id,
          response_sla_hours: data.response_sla_hours,
          resolution_sla_hours: data.resolution_sla_hours,
          escalation_hours: data.escalation_hours || undefined,
          business_hours_only: data.business_hours_only,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving SLA config:", error);
    }
  };

  const isLoading = createConfig.isPending || updateConfig.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config ? "Edit" : "Add"} SLA Configuration</DialogTitle>
          <DialogDescription>
            Configure response and resolution SLA times for this project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priorityId}
              onValueChange={(value) => setValue("priority_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorities?.map((priority) => (
                  <SelectItem key={priority.id} value={priority.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: priority.color || '#666' }}
                      />
                      {priority.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="response_sla_hours">Response SLA (hours)</Label>
              <Input
                id="response_sla_hours"
                type="number"
                min="1"
                {...register("response_sla_hours", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution_sla_hours">Resolution SLA (hours)</Label>
              <Input
                id="resolution_sla_hours"
                type="number"
                min="1"
                {...register("resolution_sla_hours", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalation_hours">Escalation Time (hours)</Label>
            <Input
              id="escalation_hours"
              type="number"
              min="0"
              {...register("escalation_hours", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Leave as 0 for no automatic escalation
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Business Hours Only</Label>
              <p className="text-xs text-muted-foreground">
                Only count SLA time during business hours
              </p>
            </div>
            <Switch
              checked={businessHoursOnly}
              onCheckedChange={(checked) => setValue("business_hours_only", checked)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !priorityId}>
              {isLoading ? "Saving..." : config ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
