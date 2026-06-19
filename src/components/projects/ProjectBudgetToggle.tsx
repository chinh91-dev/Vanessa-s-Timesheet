
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectBudgetToggleProps {
  hasBudgetLimit: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

const ProjectBudgetToggle = ({ hasBudgetLimit, onToggle, disabled }: ProjectBudgetToggleProps) => {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Switch
          id="has-budget-limit"
          checked={hasBudgetLimit}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
        <Label htmlFor="has-budget-limit" className="text-sm">
          Has Budget Limit
        </Label>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              {hasBudgetLimit 
                ? "This project tracks time against a budget limit and will show warnings when approaching the limit."
                : "This project has unlimited budget and will not track time against any limit. Ideal for internal projects."
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ProjectBudgetToggle;
