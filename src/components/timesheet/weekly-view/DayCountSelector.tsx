
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical, RotateCcw } from "lucide-react";

interface DayCountSelectorProps {
  currentDays: number;
  hasOverride: boolean;
  onDaysChange: (days: number) => void;
  onRevertToDefault: () => void;
  isUpdating: boolean;
  isReverting: boolean;
}

const DayCountSelector: React.FC<DayCountSelectorProps> = ({
  currentDays,
  hasOverride,
  onDaysChange,
  onRevertToDefault,
  isUpdating,
  isReverting
}) => {
  const dayOptions = [0, 1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {dayOptions.map((days) => (
          <Button
            key={days}
            variant={currentDays === days ? "default" : "outline"}
            size="sm"
            onClick={() => onDaysChange(days)}
            disabled={isUpdating || isReverting}
            className="min-w-[40px]"
          >
            {days}
          </Button>
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        {hasOverride && (
          <Badge variant="outline" className="text-xs">
            Custom
          </Badge>
        )}
        
        {hasOverride && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={onRevertToDefault}
                disabled={isReverting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert to default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default DayCountSelector;
