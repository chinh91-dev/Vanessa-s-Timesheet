import { DragDropContext, Droppable, DropResult } from "react-beautiful-dnd";
import { useQueryClient } from "@tanstack/react-query";
import { PipelineColumn } from "./PipelineColumn";
import { DealDialog } from "@/components/crm/deals/DealDialog";
import { CloseLostDialog } from "@/components/crm/deals/CloseLostDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { PipelineItem, PipelineStage } from "@/lib/crm/types";

interface PipelineBoardProps {
  deals: PipelineItem[];
  isLoading: boolean;
  activeStages: PipelineStage[];
  validateAndMoveDeal: (deal: PipelineItem, newStageId: string) => Promise<void>;
  selectedDeal?: PipelineItem;
  setSelectedDeal: (deal: PipelineItem | undefined) => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  pendingTargetStageId: string | null;
  setPendingTargetStageId: (id: string | null) => void;
  dialogResetKey: number;
  closeLostDialogOpen: boolean;
  setCloseLostDialogOpen: (open: boolean) => void;
  closeLostDealData: { deal: PipelineItem; targetStageId: string; targetStageName: string } | null;
  executeCloseLostMove: (reason: string, reasonOther?: string) => Promise<void>;
}

export function PipelineBoard({
  deals,
  isLoading,
  activeStages,
  validateAndMoveDeal,
  selectedDeal,
  setSelectedDeal,
  dialogOpen,
  setDialogOpen,
  pendingTargetStageId,
  setPendingTargetStageId,
  dialogResetKey,
  closeLostDialogOpen,
  setCloseLostDialogOpen,
  closeLostDealData,
  executeCloseLostMove,
}: PipelineBoardProps) {
  const queryClient = useQueryClient();

  // Filter deals to only those matching active stages
  const activeStageIds = new Set(activeStages.map(s => s.id));
  const validDeals = deals.filter(d => activeStageIds.has(d.stage_id));

  // Group deals by stage_id
  const dealsByStage = validDeals.reduce((acc, deal) => {
    const stageId = deal.stage_id;
    if (!acc[stageId]) acc[stageId] = [];
    acc[stageId].push(deal);
    return acc;
  }, {} as Record<string, PipelineItem[]>);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStageId = destination.droppableId;
    const dealId = draggableId;
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    // Optimistic update
    queryClient.setQueryData<PipelineItem[]>(['crm', 'pipeline'], (old) =>
      old?.map(d => d.id === dealId ? { ...d, stage_id: newStageId } : d) ?? []
    );

    try {
      await validateAndMoveDeal(deal, newStageId);
    } catch {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
    }
  };

  const handleDealClick = (deal: PipelineItem) => {
    setSelectedDeal(deal);
    setPendingTargetStageId(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 md:p-6 overflow-x-auto">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="w-[320px] min-w-[320px] max-w-[320px] flex-shrink-0">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!activeStages.length) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card>
          <CardContent className="py-12 px-8 text-center">
            <p className="text-muted-foreground">No pipeline stages configured</p>
            <p className="text-sm text-muted-foreground mt-2">Contact an administrator to set up stages</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 md:p-6 overflow-x-scroll overflow-y-hidden h-full items-start pb-6 pipeline-scroll">
          {activeStages.map(stage => (
            <Droppable key={stage.id} droppableId={stage.id}>
              {(provided, snapshot) => (
                <PipelineColumn
                  stage={stage}
                  deals={dealsByStage[stage.id] || []}
                  onDealClick={handleDealClick}
                  isDraggingOver={snapshot.isDraggingOver}
                  droppableRef={provided.innerRef}
                  droppableProps={provided.droppableProps}
                  placeholder={provided.placeholder}
                />
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <DealDialog
        key={dialogResetKey}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedDeal(undefined);
          setPendingTargetStageId(null);
          queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
        }}
        deal={selectedDeal as any}
        pendingTargetStageId={pendingTargetStageId}
        hideFieldsOnEdit
      />

      <CloseLostDialog
        open={closeLostDialogOpen}
        onClose={() => {
          setCloseLostDialogOpen(false);
        }}
        onConfirm={async (data) => {
          await executeCloseLostMove(data.reason, data.reasonOther);
        }}
        dealName={(closeLostDealData?.deal as any)?.name || (closeLostDealData?.deal as any)?.deal_name || ""}
        dealId={closeLostDealData?.deal?.id || ""}
        stageId={closeLostDealData?.targetStageId || ""}
        stageName={closeLostDealData?.targetStageName || "Closed Lost"}
      />
    </>
  );
}
