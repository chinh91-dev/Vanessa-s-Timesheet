
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Project } from "@/lib/timesheet/types";
import { saveProject, updateProject } from "@/lib/timesheet/project-service";
import CustomerSelector from "@/components/customers/CustomerSelector";
import ProjectBudgetToggle from "./ProjectBudgetToggle";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  budget_hours: z.number().min(0, "Budget hours must be non-negative"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  customer_id: z.string().optional(),
  is_internal: z.boolean().default(false),
  has_budget_limit: z.boolean().default(true),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface AddEditProjectFormProps {
  existingProject?: Project | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const AddEditProjectForm = ({ existingProject, onSuccess, onCancel }: AddEditProjectFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBudgetLimit, setHasBudgetLimit] = useState(existingProject?.has_budget_limit ?? true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: existingProject?.name || "",
      description: existingProject?.description || "",
      budget_hours: existingProject?.budget_hours || 0,
      start_date: existingProject?.start_date || "",
      end_date: existingProject?.end_date || "",
      customer_id: existingProject?.customer_id || "",
      is_internal: existingProject?.is_internal || false,
      has_budget_limit: existingProject?.has_budget_limit ?? true,
    },
  });

  const isInternal = watch("is_internal");
  const customerIdValue = watch("customer_id");

  useEffect(() => {
    if (existingProject) {
      reset({
        name: existingProject.name,
        description: existingProject.description || "",
        budget_hours: existingProject.budget_hours,
        start_date: existingProject.start_date || "",
        end_date: existingProject.end_date || "",
        customer_id: existingProject.customer_id || "",
        is_internal: existingProject.is_internal || false,
        has_budget_limit: existingProject.has_budget_limit ?? true,
      });
      setHasBudgetLimit(existingProject.has_budget_limit ?? true);
    }
  }, [existingProject, reset]);

  useEffect(() => {
    setValue("has_budget_limit", hasBudgetLimit);
    // If budget limit is disabled, set budget_hours to 0
    if (!hasBudgetLimit) {
      setValue("budget_hours", 0);
    }
  }, [hasBudgetLimit, setValue]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setIsSubmitting(true);
      
      // Ensure all required fields are present and convert empty strings to null
      const projectData: Omit<Project, 'id' | 'hours_used'> = {
        name: data.name,
        description: data.description || undefined,
        budget_hours: hasBudgetLimit ? data.budget_hours : 0,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        customer_id: data.customer_id || null,
        is_internal: data.is_internal,
        has_budget_limit: hasBudgetLimit,
      };

      if (existingProject) {
        await updateProject(existingProject.id, projectData);
        toast({
          title: "Success",
          description: "Project updated successfully.",
        });
      } else {
        await saveProject(projectData);
        toast({
          title: "Success",
          description: "Project created successfully.",
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Error",
        description: "Failed to save project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Enter project name"
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Enter project description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            {...register("start_date")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            {...register("end_date")}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_internal"
            {...register("is_internal")}
            onCheckedChange={(checked) => setValue("is_internal", checked)}
          />
          <Label htmlFor="is_internal">Internal Project</Label>
        </div>

        <ProjectBudgetToggle
          hasBudgetLimit={hasBudgetLimit}
          onToggle={setHasBudgetLimit}
          disabled={isSubmitting}
        />
      </div>

      {hasBudgetLimit && (
        <div className="space-y-2">
          <Label htmlFor="budget_hours">Budget Hours *</Label>
          <Input
            id="budget_hours"
            type="number"
            min="0"
            step="0.1"
            {...register("budget_hours", { valueAsNumber: true })}
            placeholder="Enter budget hours"
          />
          {errors.budget_hours && (
            <p className="text-sm text-red-600">{errors.budget_hours.message}</p>
          )}
        </div>
      )}

      {!isInternal && (
        <div className="space-y-2">
          <Label>Customer</Label>
          <CustomerSelector
            selectedCustomerId={customerIdValue || null}
            onSelectCustomer={(customerId) => setValue("customer_id", customerId || "")}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : existingProject
            ? "Update Project"
            : "Create Project"}
        </Button>
      </div>
    </form>
  );
};

export default AddEditProjectForm;
