
import React from "react";
import { createPortal } from "react-dom";
import { TimesheetEntry, duplicateTimesheetEntry } from "@/lib/timesheet-service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, FileText, GripVertical, Copy, User, Pencil, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

// Color mapping for different project types
export const PROJECT_COLORS: { [key: string]: string } = {
  default: "bg-muted border-border hover:bg-muted/80 dark:bg-muted dark:border-border dark:hover:bg-muted/60",
  development: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900",
  design: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900",
  marketing: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900",
  management: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900",
  support: "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900",
};

interface EntryCardProps {
  entry: TimesheetEntry;
  provided: any;
  snapshot: any;
  onEditEntry: (entry: TimesheetEntry) => void;
  onDeleteEntry: (entry: TimesheetEntry) => void;
  onEntryChange: () => void;
}

export const getProjectColor = (project?: { name?: string }) => {
  if (!project?.name) return PROJECT_COLORS.default;
  
  const name = project.name.toLowerCase();
  
  if (name.includes("dev") || name.includes("code")) {
    return PROJECT_COLORS.development;
  } else if (name.includes("design") || name.includes("ui") || name.includes("ux")) {
    return PROJECT_COLORS.design;
  } else if (name.includes("market") || name.includes("sales")) {
    return PROJECT_COLORS.marketing;
  } else if (name.includes("manage") || name.includes("lead") || name.includes("admin")) {
    return PROJECT_COLORS.management;
  } else if (name.includes("support") || name.includes("help") || name.includes("service")) {
    return PROJECT_COLORS.support;
  }
  
  return PROJECT_COLORS.default;
};

// New function to get color for any entry type
export const getEntryColor = (entry: TimesheetEntry) => {
  if (entry.entry_type === 'project' && entry.project) {
    return getProjectColor(entry.project);
  } else if (entry.entry_type === 'contract' && entry.contract) {
    return getProjectColor({ name: entry.contract.name });
  }
  return PROJECT_COLORS.default;
};

// New function to get display name for any entry type
export const getEntryDisplayName = (entry: TimesheetEntry) => {
  if (entry.entry_type === 'project' && entry.project) {
    return entry.project.name;
  } else if (entry.entry_type === 'contract' && entry.contract) {
    return entry.contract.name;
  }
  return "Unknown Entry";
};

export const formatUserName = (entry: TimesheetEntry) => {
  // First try to use cached user_full_name from database
  if (entry.user_full_name) {
    const nameParts = entry.user_full_name.trim().split(" ");
    if (nameParts.length > 1) {
      return `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`;
    }
    return entry.user_full_name;
  }
  
  // Fallback to user object (for legacy data)
  const user = entry.user;
  if (!user) {
    return "Unknown";
  }
  
  if (user.full_name) {
    const nameParts = user.full_name.trim().split(" ");
    if (nameParts.length > 1) {
      return `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`;
    }
    return user.full_name;
  }
  
  if (user.email) {
    const emailUsername = user.email.split("@")[0];
    return emailUsername;
  }
  
  return "Unknown";
};

const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  provided,
  snapshot,
  onEditEntry,
  onDeleteEntry,
  onEntryChange
}) => {
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  
  const handleDuplicateEntry = async (entry: TimesheetEntry) => {
    if (!entry.id) return;
    
    try {
      setIsDuplicating(true);
      await duplicateTimesheetEntry(entry.id);
      
      toast({
        title: "Entry duplicated",
        description: "Time entry has been duplicated successfully.",
      });
      
      onEntryChange();
    } catch (error) {
      console.error("Error duplicating entry:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate time entry.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const card = (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "transition-all duration-300 hover:shadow-md animate-in fade-in-50",
        snapshot.isDragging ? "opacity-90 shadow-lg z-[9999]" : ""
      )}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200 border rounded-xl",
          getEntryColor(entry)
        )}
      >
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center gap-2 mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    {...provided.dragHandleProps} 
                    className="cursor-grab opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <GripVertical className="h-3 w-3 flex-shrink-0" aria-label="Drag to reorder" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Drag to reorder this entry</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <h3 className="font-semibold text-xs md:text-sm break-words whitespace-normal w-full">
              {getEntryDisplayName(entry)}
            </h3>
          </div>

          <div className="flex justify-between items-center mb-2">
            <div className="text-xs md:text-sm font-bold rounded-full bg-background/50 px-2 py-0.5 flex items-center flex-shrink-0">
              <Clock className="h-3 w-3 mr-1 inline flex-shrink-0" aria-hidden="true" />
              {entry.hours_logged} hr{entry.hours_logged !== 1 ? "s" : ""}
            </div>
            
            {entry.jira_task_id && (
              <div className="text-[10px] md:text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 inline-block truncate max-w-[120px]">
                {entry.jira_task_id}
              </div>
            )}
          </div>
          
          <div className="flex items-center mt-1.5 mb-1.5 text-[10px] md:text-xs text-muted-foreground">
            <User className="h-3 w-3 mr-1 flex-shrink-0" aria-hidden="true" />
            <span>{formatUserName(entry)}</span>
          </div>
          
          {entry.start_time && entry.end_time && (
            <div className="flex items-center mt-2 bg-background/20 p-1 rounded-md text-[10px] md:text-xs">
              <Clock className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              <span className="text-muted-foreground">
                {entry.start_time} - {entry.end_time}
              </span>
            </div>
          )}
          
          {entry.notes && (
            <div className="flex items-start mt-2 bg-background/30 p-1.5 rounded-md">
              <FileText className="h-3 w-3 mt-0.5 text-muted-foreground mr-1.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-[10px] md:text-xs text-muted-foreground break-words whitespace-normal w-full">
                {entry.notes}
              </p>
            </div>
          )}
          
          <div className="flex justify-end mt-3 space-x-1 pt-1 border-t border-t-background/20">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-amber-50 hover:text-amber-600 transition-colors flex-shrink-0 hover:border-amber-100 hover:scale-110"
                    onClick={() => handleDuplicateEntry(entry)}
                    aria-label="Duplicate entry"
                    disabled={isDuplicating}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicate this entry</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-green-50 hover:text-green-600 transition-colors flex-shrink-0 hover:border-green-100 hover:scale-110"
                    onClick={() => onEditEntry(entry)}
                    aria-label="Edit entry"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit this entry</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                    onClick={() => onDeleteEntry(entry)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete this entry</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (snapshot.isDragging) {
    return createPortal(card, document.body);
  }

  return card;
};

export default EntryCard;
