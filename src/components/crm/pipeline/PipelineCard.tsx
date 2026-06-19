import { useMemo } from "react";
import { Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/crm/formatting";
import { Calendar, FileText } from "lucide-react";
import { differenceInDays } from "date-fns";
import type { PipelineItem } from "@/lib/crm/types";
import { cn } from "@/lib/utils";
import { getOwnerColor } from "@/lib/crm/ownerColors";

interface PipelineCardProps {
  deal: PipelineItem;
  index: number;
  onClick: () => void;
}

const STALE_THRESHOLD_DAYS = 14;

export function PipelineCard({ deal, index, onClick }: PipelineCardProps) {
  // Calculate if deal is stale (in current stage > 7 days)
  const isStale = useMemo(() => {
    const stageEntryDate = deal.stage_entered_at 
      ? new Date(deal.stage_entered_at) 
      : new Date(deal.created_at);
    return differenceInDays(new Date(), stageEntryDate) > STALE_THRESHOLD_DAYS;
  }, [deal.stage_entered_at, deal.created_at]);

  // Get owner color for avatar ring
  const ownerColor = useMemo(() => getOwnerColor(deal.owner_id), [deal.owner_id]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "cursor-pointer hover:shadow-md transition-shadow overflow-hidden border-l-4",
            deal.is_closed_won
              ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/20"
              : deal.is_closed_lost
                ? "border-l-red-500 bg-red-50/30 dark:bg-red-950/20"
                : isStale
                  ? "border-l-red-500 bg-red-50/30 dark:bg-red-950/20"
                  : "border-l-green-500 bg-green-50/30 dark:bg-green-950/20",
            snapshot.isDragging && "shadow-lg rotate-2"
          )}
          onClick={onClick}
        >
          <CardContent className="p-3 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">
                  {deal.deal_name || "Untitled Deal"}
                </h4>
                {deal.account_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {deal.account_name}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold text-primary flex-shrink-0">
                {formatCurrency(deal.amount || 0)}
              </span>
            </div>

            {/* Close Date */}
            {deal.close_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-hidden">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Close: {formatDate(deal.close_date)}</span>
              </div>
            )}

            {/* Contact Notes */}
            {deal.contact_notes && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <div className="flex items-start gap-1">
                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{deal.contact_notes}</span>
                </div>
              </div>
            )}

            {/* Footer: Owner with colored ring */}
            <div className="flex items-center justify-between pt-1 border-t">
              {deal.owner_name ? (
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <Avatar className={cn("h-6 w-6 flex-shrink-0 ring-2", ownerColor.ring)}>
                    <AvatarFallback className="text-xs">
                      {getInitials(deal.owner_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate">
                    {deal.owner_name.split(" ")[0]}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Avatar className={cn("h-6 w-6 flex-shrink-0 ring-2", ownerColor.ring)}>
                    <AvatarFallback className="text-xs">?</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground italic">Unassigned</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
