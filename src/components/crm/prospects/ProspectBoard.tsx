import { DragDropContext, Droppable, DropResult } from "react-beautiful-dnd";
import { useQueryClient } from "@tanstack/react-query";
import { ProspectBoardColumn } from "./ProspectBoardColumn";
import { useUpdateProspect } from "@/hooks/crm/useProspects";
import type { Prospect, ProspectStage } from "@/lib/crm/types";
import { PROSPECT_STAGES } from "@/lib/crm/constants";

const STAGE_ORDER = Object.keys(PROSPECT_STAGES) as ProspectStage[];

interface ProspectBoardProps {
  prospects: Prospect[];
  onProspectClick: (prospect: Prospect) => void;
}

export function ProspectBoard({ prospects, onProspectClick }: ProspectBoardProps) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateProspect } = useUpdateProspect();

  // Group prospects by stage
  const prospectsByStage = STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = prospects.filter(p => p.stage === stage);
    return acc;
  }, {} as Record<ProspectStage, Prospect[]>);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStage = destination.droppableId as ProspectStage;
    const prospect = prospects.find(p => p.id === draggableId);
    if (!prospect || prospect.stage === newStage) return;

    // Optimistic update
    queryClient.setQueryData<Prospect[]>(["crm", "prospects"], (old) =>
      old?.map(p => p.id === draggableId ? { ...p, stage: newStage } : p) ?? []
    );

    try {
      await updateProspect({ id: prospect.id, updates: { stage: newStage } });
    } catch {
      // Roll back optimistic update; useUpdateProspect onError already shows a toast
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 md:p-6 overflow-x-scroll overflow-y-hidden h-full items-start pb-6 pipeline-scroll">
        {STAGE_ORDER.map(stage => (
          <Droppable key={stage} droppableId={stage}>
            {(provided, snapshot) => (
              <ProspectBoardColumn
                stage={stage}
                prospects={prospectsByStage[stage] || []}
                onProspectClick={onProspectClick}
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
  );
}
