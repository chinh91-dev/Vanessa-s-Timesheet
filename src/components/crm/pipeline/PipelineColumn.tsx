import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineCard } from "./PipelineCard";
import { formatCurrency } from "@/lib/crm/formatting";
import type { PipelineStage, PipelineItem } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

interface PipelineColumnProps {
  stage: PipelineStage;
  deals: PipelineItem[];
  onDealClick: (deal: PipelineItem) => void;
  isDraggingOver: boolean;
  droppableRef?: (el: HTMLElement | null) => void;
  droppableProps?: Record<string, any>;
  placeholder?: React.ReactNode;
}

export function PipelineColumn({ stage, deals, onDealClick, isDraggingOver, droppableRef, droppableProps, placeholder }: PipelineColumnProps) {
  const totalAmount = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
  const weightedAmount = totalAmount * ((stage.default_probability || 0) / 100);

  const getStageColor = (stageName: string) => {
    const name = stageName.toLowerCase();
    if (name.includes("lead")) return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/50";
    if (name.includes("qualified")) return "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/50";
    if (name.includes("proposal")) return "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/50";
    if (name.includes("quote")) return "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/50";
    if (name.includes("won")) return "border-l-green-500 bg-green-50/50 dark:bg-green-950/50";
    if (name.includes("lost")) return "border-l-red-500 bg-red-50/50 dark:bg-red-950/50";
    return "border-l-gray-500 bg-muted/50";
  };

  const setRef = (el: HTMLDivElement | null) => {
    if (droppableRef) droppableRef(el);
  };

  return (
    <Card
      ref={setRef}
      {...(droppableProps || {})}
      className={cn(
        "flex flex-col border-l-4 transition-colors w-[320px] min-w-[320px] max-w-[320px] flex-shrink-0",
        getStageColor(stage.name),
        isDraggingOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <CardHeader className="pb-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            {stage.name}
            <Badge variant="outline" className="text-xs">
              {stage.default_probability}%
            </Badge>
          </h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {deals.length} {deals.length === 1 ? "deal" : "deals"}
        </div>
        <div className="space-y-0.5 text-xs pt-1 border-t mt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weighted:</span>
            <span className="font-semibold text-primary">{formatCurrency(weightedAmount)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto max-h-[calc(100vh-640px)] space-y-2 pt-0 pb-2 pipeline-column-scroll">
        {deals.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No deals in this stage
          </div>
        ) : (
          deals.map((deal, index) => (
            <PipelineCard
              key={deal.id}
              deal={deal}
              index={index}
              onClick={() => onDealClick(deal)}
            />
          ))
        )}
        {placeholder}
      </CardContent>
    </Card>
  );
}
