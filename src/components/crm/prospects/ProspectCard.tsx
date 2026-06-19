import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Target, CalendarClock, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { StageBadge } from "./ProspectStageSelect";
import { PROSPECT_PRIORITIES, PROSPECT_STALE_DAYS } from "@/lib/crm/constants";
import type { Prospect } from "@/lib/crm/types";

interface ProspectCardProps {
  prospect: Prospect;
  onClick: () => void;
}

export function ProspectCard({ prospect, onClick }: ProspectCardProps) {
  const priorityInfo = PROSPECT_PRIORITIES[prospect.priority];
  const primaryContact = prospect.prospect_contacts?.find((pc) => pc.is_primary);
  const isConverted = !!prospect.converted_to_deal_id;
  const isStale =
    prospect.last_activity_at &&
    differenceInDays(new Date(), new Date(prospect.last_activity_at)) >= PROSPECT_STALE_DAYS;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow active:opacity-80"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug line-clamp-2">{prospect.name}</p>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StageBadge stage={prospect.stage} />
            {isConverted && <Badge variant="secondary" className="text-xs">Converted</Badge>}
            {isStale && !isConverted && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Stale
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {prospect.account && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{prospect.account.name}</span>
            </div>
          )}
          {primaryContact?.contact?.contact_name && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{primaryContact.contact.contact_name}</span>
            </div>
          )}
          {prospect.owner?.full_name && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Owner: {prospect.owner.full_name}</span>
            </div>
          )}
        </div>

        {prospect.next_action && (
          <div className="flex items-start gap-1.5 text-xs border-t pt-2">
            <Target className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-muted-foreground">Next: </span>
              <span className="line-clamp-1">{prospect.next_action}</span>
              {prospect.next_action_due_date && (
                <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                  <CalendarClock className="h-2.5 w-2.5" />
                  {format(new Date(prospect.next_action_due_date), "dd MMM yyyy")}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Badge
            style={{ backgroundColor: priorityInfo.color, color: "white", borderColor: "transparent" }}
            className="text-xs"
          >
            {priorityInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(prospect.updated_at), "dd MMM")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
