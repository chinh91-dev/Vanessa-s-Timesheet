import { useMemo } from "react";
import { Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { differenceInDays } from "date-fns";
import type { Prospect } from "@/lib/crm/types";
import { PROSPECT_STALE_DAYS } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";
import { getOwnerColor } from "@/lib/crm/ownerColors";

interface ProspectBoardCardProps {
  prospect: Prospect;
  index: number;
  onClick: () => void;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export function ProspectBoardCard({ prospect, index, onClick }: ProspectBoardCardProps) {
  const isStale = useMemo(() => {
    if (!prospect.last_activity_at) return false;
    if (prospect.converted_to_deal_id) return false;
    if (prospect.stage === "disqualified") return false;
    return differenceInDays(new Date(), new Date(prospect.last_activity_at)) >= PROSPECT_STALE_DAYS;
  }, [prospect.last_activity_at, prospect.converted_to_deal_id, prospect.stage]);

  const ownerColor = useMemo(() => getOwnerColor(prospect.owner_id), [prospect.owner_id]);

  return (
    <Draggable draggableId={prospect.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "cursor-pointer hover:shadow-md transition-shadow overflow-hidden border-l-4",
            isStale
              ? "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20"
              : prospect.stage === "disqualified"
                ? "border-l-red-500 bg-red-50/30 dark:bg-red-950/20"
                : prospect.stage === "qualified"
                  ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/20"
                  : "border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/10",
            snapshot.isDragging && "shadow-lg rotate-1"
          )}
          onClick={onClick}
        >
          <CardContent className="px-3 py-2 flex items-center justify-between gap-2">
            {/* Account name */}
            <p className="text-sm font-medium truncate flex-1 min-w-0">
              {prospect.account?.name ?? prospect.name}
            </p>

            {/* Assignee */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Avatar className={cn("h-5 w-5 ring-2", ownerColor.ring)}>
                <AvatarFallback className="text-[10px]">
                  {getInitials(prospect.owner?.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {prospect.owner?.full_name?.split(" ")[0] ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
