import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProspectBoardCard } from "./ProspectBoardCard";
import type { Prospect, ProspectStage } from "@/lib/crm/types";
import { PROSPECT_STAGES } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";

interface ProspectBoardColumnProps {
  stage: ProspectStage;
  prospects: Prospect[];
  onProspectClick: (prospect: Prospect) => void;
  isDraggingOver: boolean;
  droppableRef?: (el: HTMLElement | null) => void;
  droppableProps?: Record<string, any>;
  placeholder?: React.ReactNode;
}

export function ProspectBoardColumn({
  stage,
  prospects,
  onProspectClick,
  isDraggingOver,
  droppableRef,
  droppableProps,
  placeholder,
}: ProspectBoardColumnProps) {
  const stageConfig = PROSPECT_STAGES[stage];

  const getStageStyle = (s: ProspectStage) => {
    switch (s) {
      case "new":              return "border-l-gray-400 bg-gray-50/50 dark:bg-gray-900/30";
      case "researched":       return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/30";
      case "outreach_started": return "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/30";
      case "engaged":          return "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/30";
      case "qualified":        return "border-l-green-500 bg-green-50/50 dark:bg-green-950/30";
      case "nurture":          return "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/30";
      case "disqualified":     return "border-l-red-500 bg-red-50/50 dark:bg-red-950/30";
      default:                 return "border-l-gray-400 bg-muted/50";
    }
  };

  const setRef = (el: HTMLDivElement | null) => {
    if (droppableRef) droppableRef(el);
  };

  return (
    <Card
      ref={setRef}
      {...(droppableProps || {})}
      className={cn(
        "flex flex-col border-l-4 transition-colors w-[340px] min-w-[340px] max-w-[340px] flex-shrink-0",
        getStageStyle(stage),
        isDraggingOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <CardHeader className="pb-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{stageConfig.label}</h3>
          <Badge variant="outline" className="text-xs">{prospects.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{stageConfig.description}</p>
      </CardHeader>
      <CardContent className="overflow-y-auto max-h-[calc(100vh-320px)] space-y-2 pt-0 pb-2 pipeline-column-scroll">
        {prospects.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No prospects in this stage
          </div>
        ) : (
          prospects.map((prospect, index) => (
            <ProspectBoardCard
              key={prospect.id}
              prospect={prospect}
              index={index}
              onClick={() => onProspectClick(prospect)}
            />
          ))
        )}
        {placeholder}
      </CardContent>
    </Card>
  );
}
