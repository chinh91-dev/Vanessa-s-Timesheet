import { supabase } from "@/integrations/supabase/client";
import { Project } from "../types";
import { getUserRole } from "@/utils/roles";
import { tryServiceOperation, logServiceError, validateRequiredParams } from "@/utils/service-error-handler";

export interface BudgetValidationResult {
  isValid: boolean;
  message?: string;
  remainingHours: number;
  totalBudget: number;
  hoursUsed: number;
  isOverBudget: boolean;
  canOverride: boolean; // Whether admin can override
  usagePercentage: number;
  warningLevel: 'none' | 'approaching' | 'exceeded';
}

export interface BudgetCheckOptions {
  projectId: string;
  hoursToAdd: number;
  existingEntryId?: string; // For updates, exclude this entry from calculations
  userId?: string; // For admin override checks
}

/**
 * Calculates the current hours used for a project
 */
export const getProjectHoursUsed = async (
  projectId: string,
  excludeEntryId?: string
): Promise<number> => {
  return tryServiceOperation(
    async () => {
      validateRequiredParams({ projectId }, 'getProjectHoursUsed');

      console.log(`=== CALCULATING PROJECT HOURS USED ===`);
      console.log(`Project ID: ${projectId}`);
      console.log(`Exclude Entry ID: ${excludeEntryId || 'none'}`);

      let query = supabase
        .from("timesheet_entries")
        .select("hours_logged")
        .eq("project_id", projectId);

      // Exclude existing entry if updating
      if (excludeEntryId) {
        query = query.neq("id", excludeEntryId);
      }

      const { data, error } = await query;

      if (error) {
        logServiceError('getProjectHoursUsed', error, { projectId, excludeEntryId });
        throw error;
      }

      const totalHours = data?.reduce((sum, entry) => sum + Number(entry.hours_logged), 0) || 0;
      console.log(`Total hours used: ${totalHours}`);
      return totalHours;
    },
    {
      context: 'getProjectHoursUsed',
      fallbackValue: 0
    }
  );
};

/**
 * Gets project budget information
 */
export const getProjectBudget = async (projectId: string): Promise<Project | null> => {
  return tryServiceOperation(
    async () => {
      validateRequiredParams({ projectId }, 'getProjectBudget');

      console.log(`=== FETCHING PROJECT BUDGET ===`);
      console.log(`Project ID: ${projectId}`);

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, budget_hours, is_active, has_budget_limit")
        .eq("id", projectId)
        .maybeSingle();

      if (error) {
        logServiceError('getProjectBudget', error, { projectId });
        throw error;
      }

      if (!data) {
        console.log("Project not found");
        return null;
      }

      console.log(`Project: ${data.name}, Budget: ${data.budget_hours} hours`);
      return data as Project;
    },
    {
      context: 'getProjectBudget',
      fallbackValue: null
    }
  );
};

/**
 * Checks if user has admin privileges for budget override
 */
export const canUserOverrideBudget = async (userId?: string): Promise<boolean> => {
  if (!userId) {
    return false;
  }

  return tryServiceOperation(
    async () => {
      const userRole = await getUserRole(userId);
      const isAdmin = userRole === "admin";
      console.log(`User ${userId} admin status: ${isAdmin}`);
      return isAdmin;
    },
    {
      context: 'canUserOverrideBudget',
      fallbackValue: false
    }
  );
};

/**
 * Main budget validation function
 */
export const validateProjectBudget = async (
  options: BudgetCheckOptions
): Promise<BudgetValidationResult> => {
  return tryServiceOperation(
    async () => {
      validateRequiredParams(
        { projectId: options.projectId, hoursToAdd: options.hoursToAdd },
        'validateProjectBudget'
      );

      console.log(`=== VALIDATING PROJECT BUDGET ===`);
      console.log(`Options:`, options);

      const { projectId, hoursToAdd, existingEntryId, userId } = options;

    // Get project budget information
    const project = await getProjectBudget(projectId);
    if (!project) {
      console.log("Project not found - validation failed");
      return {
        isValid: false,
        message: "Project not found",
        remainingHours: 0,
        totalBudget: 0,
        hoursUsed: 0,
        isOverBudget: true,
        canOverride: false,
        usagePercentage: 0,
        warningLevel: 'exceeded' as const
      };
    }

    // Check if project is active
    if (!project.is_active) {
      console.log("Project is inactive - validation failed");
      return {
        isValid: false,
        message: "Cannot log time to inactive project",
        remainingHours: 0,
        totalBudget: project.budget_hours || 0,
        hoursUsed: 0,
        isOverBudget: true,
        canOverride: false,
        usagePercentage: 0,
        warningLevel: 'exceeded' as const
      };
    }

    // Get current hours used (excluding current entry if updating)
    const hoursUsed = await getProjectHoursUsed(projectId, existingEntryId);
    const totalBudget = project.budget_hours || 0;

    // Handle projects without budget limits
    if (project.has_budget_limit === false) {
      console.log("Project has no budget limit - validation passed");
      return {
        isValid: true,
        remainingHours: Infinity,
        totalBudget: 0,
        hoursUsed,
        isOverBudget: false,
        canOverride: false,
        usagePercentage: 0,
        warningLevel: 'none' as const
      };
    }

    // Calculate remaining hours and usage percentage
    const remainingHours = totalBudget - hoursUsed;
    const wouldExceedBudget = hoursUsed + hoursToAdd > totalBudget;
    const projectedHoursUsed = hoursUsed + hoursToAdd;
    const usagePercentage = totalBudget > 0 ? (projectedHoursUsed / totalBudget) * 100 : 0;

    // Check admin override capability
    const canOverride = await canUserOverrideBudget(userId);

    console.log(`Budget Analysis:`);
    console.log(`- Total Budget: ${totalBudget} hours`);
    console.log(`- Hours Used: ${hoursUsed} hours`);
    console.log(`- Hours to Add: ${hoursToAdd} hours`);
    console.log(`- Projected Usage: ${projectedHoursUsed} hours`);
    console.log(`- Remaining: ${remainingHours} hours`);
    console.log(`- Usage Percentage: ${usagePercentage.toFixed(2)}%`);
    console.log(`- Would Exceed: ${wouldExceedBudget}`);
    console.log(`- Can Override: ${canOverride}`);

    // Determine warning level
    let warningLevel: 'none' | 'approaching' | 'exceeded' = 'none';
    if (wouldExceedBudget) {
      warningLevel = 'exceeded';
    } else if (usagePercentage >= 75) {
      warningLevel = 'approaching';
    }

    // Budget exceeded - block employees/managers, allow admin with override
    if (wouldExceedBudget) {
      const excessHours = (projectedHoursUsed - totalBudget).toFixed(2);
      console.log(`Budget validation failed - would exceed by ${excessHours} hours`);
      
      let message;
      let isValid;
      
      if (canOverride) {
        // Admin can override - allow entry but show warning
        message = `This entry will exceed the project budget by ${excessHours} hours. Admin override applied.`;
        isValid = true;
      } else {
        // Employee/Manager blocked from exceeding budget
        message = `This project has exceeded its budget. You cannot log additional time. Please contact your administrator.`;
        isValid = false;
      }

      return {
        isValid,
        message,
        remainingHours,
        totalBudget,
        hoursUsed: projectedHoursUsed,
        isOverBudget: true,
        canOverride,
        usagePercentage,
        warningLevel
      };
    }

    // Budget approaching (75-100%) - show warning but allow entry
    if (usagePercentage >= 75) {
      console.log("Budget warning: approaching limit at " + usagePercentage.toFixed(2) + "%");
      
      const message = canOverride
        ? `Project budget is at ${usagePercentage.toFixed(0)}% capacity.`
        : `This project is nearing its budget limit. Please contact your administrator if you need additional hours.`;

      return {
        isValid: true,
        message,
        remainingHours,
        totalBudget,
        hoursUsed: projectedHoursUsed,
        isOverBudget: false,
        canOverride,
        usagePercentage,
        warningLevel
      };
    }

      // Validation passed - within budget
      console.log("Budget validation passed");

      return {
        isValid: true,
        remainingHours,
        totalBudget,
        hoursUsed: projectedHoursUsed,
        isOverBudget: false,
        canOverride,
        usagePercentage,
        warningLevel
      };
    },
    {
      context: 'validateProjectBudget',
      fallbackValue: {
        isValid: false,
        message: "Failed to validate project budget. Please try again.",
        remainingHours: 0,
        totalBudget: 0,
        hoursUsed: 0,
        isOverBudget: true,
        canOverride: false,
        usagePercentage: 0,
        warningLevel: 'exceeded' as const
      }
    }
  );
};

/**
 * Simplified function to check if hours can be added to a project
 */
export const canAddHoursToProject = async (
  projectId: string,
  hoursToAdd: number,
  userId?: string,
  existingEntryId?: string
): Promise<{ canAdd: boolean; message?: string }> => {
  const validation = await validateProjectBudget({
    projectId,
    hoursToAdd,
    existingEntryId,
    userId
  });

  return {
    canAdd: validation.isValid,
    message: validation.message
  };
};

/**
 * Get budget status for display purposes
 */
export const getProjectBudgetStatus = async (
  projectId: string
): Promise<{
  totalBudget: number;
  hoursUsed: number;
  remainingHours: number;
  usagePercentage: number;
  isOverBudget: boolean;
} | null> => {
  try {
    const project = await getProjectBudget(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Only return budget info for projects with budget limits
    if (project.has_budget_limit === false) {
      return null;
    }

    const hoursUsed = await getProjectHoursUsed(projectId);
    const totalBudget = project.budget_hours || 0;

    const remainingHours = totalBudget - hoursUsed;
    const usagePercentage = totalBudget > 0 ? (hoursUsed / totalBudget) * 100 : 0;
    const isOverBudget = hoursUsed > totalBudget;

    return {
      totalBudget,
      hoursUsed,
      remainingHours,
      usagePercentage,
      isOverBudget
    };
  } catch (error) {
    console.error("Error getting project budget status:", error);
    return null;
  }
};
