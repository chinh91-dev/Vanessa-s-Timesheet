import React, { useEffect, useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { Project } from "@/lib/timesheet-service";
import { TimeEntryFormValues } from "./schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { getProjectBudgetStatus } from "@/lib/timesheet/validation/budget-validation-service";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
  control: Control<TimeEntryFormValues>;
  projects: Project[];
}

interface ProjectBudgetInfo {
  [projectId: string]: {
    totalBudget: number;
    hoursUsed: number;
    remainingHours: number;
    usagePercentage: number;
    isOverBudget: boolean;
  };
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ control, projects }) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const [budgetInfo, setBudgetInfo] = useState<ProjectBudgetInfo>({});
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);

  // Force refresh budget info when projects change (e.g., after saving an entry)
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [projects]);

  // Fetch budget information for all projects (still needed for validation)
  useEffect(() => {
    const fetchBudgetInfo = async () => {
      if (projects.length === 0) return;

      setLoadingBudgets(true);
      try {
        const budgetPromises = projects.map(async (project) => {
          const budget = await getProjectBudgetStatus(project.id);
          return { projectId: project.id, budget };
        });

        const results = await Promise.all(budgetPromises);
        const budgetMap: ProjectBudgetInfo = {};
        
        results.forEach(({ projectId, budget }) => {
          // Only add budget info for projects with budget limits
          if (budget) {
            budgetMap[projectId] = budget;
          }
        });

        setBudgetInfo(budgetMap);
      } catch (error) {
        console.error("Error fetching project budget info:", error);
      } finally {
        setLoadingBudgets(false);
      }
    };

    fetchBudgetInfo();
  }, [projects, refreshKey]);

  // Simple display for employees - just project name
  const formatProjectDisplayForEmployee = (project: Project) => {
    return project.name;
  };

  // Detailed display for admins with budget info
  const formatProjectDisplayForAdmin = (project: Project) => {
    const budget = budgetInfo[project.id];
    if (!budget) return project.name;

    const usedDisplay = budget.hoursUsed.toFixed(2);
    const totalDisplay = budget.totalBudget.toFixed(2);
    
    return `${project.name} (${usedDisplay}/${totalDisplay}h used)`;
  };

  // Employee version - simple project display
  const renderProjectOptionForEmployee = (project: Project) => {
    const budget = budgetInfo[project.id];
    
    return (
      <div className="flex flex-col space-y-1">
        <span>{project.name}</span>
        {budget && budget.isOverBudget && (
          <div className="text-xs text-red-600 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Over budget - Contact administrator
          </div>
        )}
      </div>
    );
  };

  // Admin version - detailed project display with budget info
  const renderProjectOptionForAdmin = (project: Project) => {
    const budget = budgetInfo[project.id];
    if (!budget || loadingBudgets) {
      return (
        <div className="flex flex-col space-y-1">
          <span>{project.name}</span>
          {loadingBudgets && (
            <div className="h-1 bg-gray-200 rounded animate-pulse" />
          )}
        </div>
      );
    }

    const usagePercentage = Math.min(budget.usagePercentage, 100);
    const colorClass = budget.isOverBudget ? "text-red-600" : 
                      budget.usagePercentage >= 95 ? "text-red-600" :
                      budget.usagePercentage >= 75 ? "text-yellow-600" : "text-green-600";

    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{project.name}</span>
          {budget.isOverBudget && (
            <AlertCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className={colorClass}>
            {budget.hoursUsed.toFixed(2)}/{budget.totalBudget.toFixed(2)}h used
          </span>
          <span className={colorClass}>
            {budget.usagePercentage.toFixed(0)}%
          </span>
        </div>
        
        {budget.remainingHours <= 5 && budget.remainingHours > 0 && (
          <div className="text-xs text-yellow-600 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {budget.remainingHours.toFixed(2)}h remaining
          </div>
        )}
        
        {budget.isOverBudget && (
          <div className="text-xs text-red-600 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Over budget by {Math.abs(budget.remainingHours).toFixed(2)}h
          </div>
        )}
      </div>
    );
  };

  const getDisplayText = (projectId: string) => {
    const selectedProject = projects.find(p => p.id === projectId);
    if (!selectedProject) return "Select a project";
    
    return isAdmin 
      ? formatProjectDisplayForAdmin(selectedProject)
      : formatProjectDisplayForEmployee(selectedProject);
  };

  return (
    <FormField
      control={control}
      name="project_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-medium">Project*</FormLabel>
          {projects.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No projects available. You can only log time to projects you're assigned to. 
                Please contact your administrator to get assigned to projects.
              </AlertDescription>
            </Alert>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      "w-full justify-between font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? getDisplayText(field.value) : "Select a project"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search projects..." />
                  <CommandList>
                    <CommandEmpty>No project found.</CommandEmpty>
                    <CommandGroup>
                      {projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={project.name}
                          onSelect={() => {
                            field.onChange(project.id);
                            setOpen(false);
                          }}
                          className="p-3"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              field.value === project.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            {isAdmin
                              ? renderProjectOptionForAdmin(project)
                              : renderProjectOptionForEmployee(project)
                            }
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
