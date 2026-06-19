
import { toast } from "@/hooks/use-toast";
import { BudgetValidationResult } from "./validation/budget-validation-service";

export const showBudgetToast = (validation: BudgetValidationResult, projectName?: string, userRole?: string) => {
  const project = projectName ? `for ${projectName}` : "";
  const isAdmin = userRole === "admin";
  
  if (!validation.isValid && !validation.canOverride) {
    // Error toast for budget exceeded - generic message for employees/managers
    if (isAdmin) {
      toast({
        title: "Budget Exceeded",
        description: `Cannot save entry ${project}. ${validation.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Budget Exceeded",
        description: `Cannot save - project budget exceeded. Contact your administrator.`,
        variant: "destructive",
      });
    }
  } else if (!validation.isValid && validation.canOverride) {
    // Warning toast for admin override
    if (isAdmin) {
      toast({
        title: "Budget Override Used",
        description: `Entry saved ${project} with admin override. ${validation.message}`,
        variant: "default",
      });
    } else {
      toast({
        title: "Entry Saved",
        description: `Your entry has been saved.`,
        variant: "default",
      });
    }
  } else if (validation.warningLevel === 'approaching') {
    // Warning toast for approaching budget
    if (isAdmin) {
      toast({
        title: "Budget Warning",
        description: `${validation.message} Project ${project} is at ${validation.usagePercentage.toFixed(0)}% of budget.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Budget Warning",
        description: `Project budget is nearing its limit. Contact your administrator if more time is needed.`,
        variant: "default",
      });
    }
  }
};

export const showBudgetSaveSuccess = (
  isUpdate: boolean, 
  validation?: BudgetValidationResult, 
  projectName?: string,
  userRole?: string
) => {
  const isAdmin = userRole === "admin";
  let description = isUpdate ? "Your timesheet entry has been updated." : "Your timesheet entry has been created.";
  
  // Show budget override information to admins
  if (validation && validation.canOverride && !validation.isValid && isAdmin) {
    description += " Budget override was applied.";
  }
  
  // Show warning acknowledgment for non-admins when approaching budget
  if (validation && validation.warningLevel === 'approaching' && !isAdmin) {
    description += " Note: This project is nearing its budget limit.";
  }
  
  toast({
    title: isUpdate ? "Entry Updated" : "Entry Created",
    description,
    variant: "default",
  });
};
