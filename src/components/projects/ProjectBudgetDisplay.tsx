
import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/lib/timesheet/types";

interface ProjectBudgetDisplayProps {
  project: Project;
  showProgress?: boolean;
  isInternal?: boolean;
}

const ProjectBudgetDisplay = ({ project, showProgress = true, isInternal = false }: ProjectBudgetDisplayProps) => {
  const hoursUsed = project.hours_used || 0;
  const budgetHours = project.budget_hours || 0;
  const hasBudgetLimit = project.has_budget_limit !== false; // Default to true if undefined

  // Only show budget display if there's a budget limit
  if (!hasBudgetLimit) {
    return null;
  }

  const progressPercentage = budgetHours > 0 ? Math.min((hoursUsed / budgetHours) * 100, 100) : 0;
  const isOverBudget = hoursUsed > budgetHours;
  const isNearBudget = progressPercentage >= 80 && !isOverBudget;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className={isInternal ? 'text-white/70' : 'text-muted-foreground'}>Budget Progress</span>
        <span className={`font-medium ${
          isInternal 
            ? 'text-white' 
            : isOverBudget ? 'text-red-600' : isNearBudget ? 'text-amber-600' : 'text-foreground'
        }`}>
          {hoursUsed}h / {budgetHours}h
        </span>
      </div>
      {showProgress && (
        <Progress 
          value={progressPercentage} 
          className={`h-2 ${isOverBudget ? 'bg-red-100' : isNearBudget ? 'bg-amber-100' : ''}`}
        />
      )}
      {isOverBudget && (
        <Badge variant="destructive" className={`text-xs ${isInternal ? 'bg-red-500/20 text-white border-red-400/30' : ''}`}>
          Over Budget by {(hoursUsed - budgetHours).toFixed(2)}h
        </Badge>
      )}
      {isNearBudget && (
        <Badge variant="outline" className={`text-xs ${
          isInternal 
            ? 'text-white/90 border-white/30' 
            : 'text-amber-600 border-amber-200'
        }`}>
          Approaching Budget Limit
        </Badge>
      )}
    </div>
  );
};

export default ProjectBudgetDisplay;
