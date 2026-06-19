import type { PipelineStage } from "./types";

// Stage order for movement validation
export const STAGE_ORDER: Record<string, number> = {
  lead: 1,
  qualified: 2,
  proposal: 3,
  quote: 4,
  closed_won: 5,
  closed_lost: 6,
};

// Stage colors using semantic tokens
export const STAGE_COLORS: Record<string, string> = {
  lead: "border-l-blue-500",
  qualified: "border-l-purple-500",
  proposal: "border-l-orange-500",
  quote: "border-l-yellow-500",
  closed_won: "border-l-green-500",
  closed_lost: "border-l-red-500",
};

// Validate if movement to target stage is allowed
export const canMoveToStage = (
  currentStageOrder: number,
  targetStage: PipelineStage
): { allowed: boolean; reason?: string } => {
  // All direction restrictions removed — deals can move freely between stages
  return { allowed: true };
};

// Get next stage in progression
export const getNextStage = (
  currentStage: PipelineStage,
  allStages: PipelineStage[]
): PipelineStage | null => {
  const currentOrder = currentStage.stage_order;
  const nextStage = allStages.find(
    (stage) => stage.stage_order === currentOrder + 1
  );
  return nextStage || null;
};

// Extract service type from tags array
export const extractServiceType = (tags: string[] | null): string | null => {
  if (!tags) return null;
  const serviceTag = tags.find((tag) => tag.startsWith("service:"));
  return serviceTag ? serviceTag.replace("service:", "").replace(/_/g, " ") : null;
};

// Get assigned employee from tags
export const getAssigneeFromTags = (tags: string[] | null): string | null => {
  if (!tags) return null;
  const employeeTags = tags.filter(
    (tag) => !tag.startsWith("service:") && tag !== "commission"
  );
  return employeeTags[0] ? employeeTags[0].replace(/_/g, " ") : null;
};

// Check if opportunity has commission tag
export const hasCommissionTag = (tags: string[] | null): boolean => {
  return tags?.includes("commission") || false;
};
