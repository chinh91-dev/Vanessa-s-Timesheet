import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Building2,
  User,
  Target,
  TrendingUp,
  Ban,
  RefreshCw,
  CalendarClock,
  Clock,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ProspectNotesSection } from "./ProspectNotesSection";
import { ProspectActivityLog } from "./ProspectActivityLog";
import { ProspectDialog } from "./ProspectDialog";
import { ConvertProspectToDealDialog } from "./ConvertProspectToDealDialog";
import { StageBadge } from "./ProspectStageSelect";
import { useUpdateProspect, useDeleteProspect } from "@/hooks/crm/useProspects";
import { PROSPECT_PRIORITIES, PROSPECT_STALE_DAYS } from "@/lib/crm/constants";
import { canDeleteProspect } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";
import type { Prospect } from "@/lib/crm/types";

interface ProspectDetailPanelProps {
  prospect: Prospect | null;
  open: boolean;
  onClose: () => void;
}

export function ProspectDetailPanel({ prospect, open, onClose }: ProspectDetailPanelProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { userRole } = useAuth();
  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();

  if (!prospect) return null;

  const isConverted = !!prospect.converted_to_deal_id;
  const isDisqualified = prospect.stage === "disqualified";
  const isQualified = prospect.stage === "qualified";
  const isStale =
    prospect.last_activity_at &&
    differenceInDays(new Date(), new Date(prospect.last_activity_at)) >= PROSPECT_STALE_DAYS;

  const priorityInfo = PROSPECT_PRIORITIES[prospect.priority];

  const handleMoveToNurture = () => {
    const reason = window.prompt("Nurture reason (required):");
    if (!reason?.trim()) return;
    updateProspect.mutate({ id: prospect.id, updates: { stage: "nurture", nurture_reason: reason.trim() } });
  };

  const handleDisqualify = () => {
    const reason = window.prompt("Disqualified reason (required):");
    if (!reason?.trim()) return;
    updateProspect.mutate({ id: prospect.id, updates: { stage: "disqualified", disqualified_reason: reason.trim() } });
  };

  const handleDelete = () => {
    deleteProspect.mutate(prospect.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        onClose();
      },
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg leading-tight truncate">{prospect.name}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <StageBadge stage={prospect.stage} />
                  <Badge
                    style={{ backgroundColor: priorityInfo.color, color: "white", borderColor: "transparent" }}
                    className="text-xs"
                  >
                    {priorityInfo.label}
                  </Badge>
                  {isStale && !isDisqualified && !isConverted && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Stale {PROSPECT_STALE_DAYS}+ days
                    </Badge>
                  )}
                  {isConverted && (
                    <Badge variant="secondary" className="text-xs">Converted</Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {prospect.account && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{prospect.account.name}</span>
                </div>
              )}
              {prospect.owner && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{prospect.owner.full_name}</span>
                </div>
              )}
              {prospect.next_action && (
                <div className="col-span-2 flex items-start gap-2">
                  <Target className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Action</p>
                    <p>{prospect.next_action}</p>
                    {prospect.next_action_due_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarClock className="h-3 w-3" />
                        Due {format(new Date(prospect.next_action_due_date), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {prospect.last_activity_at && (
                <div className="col-span-2 flex items-center gap-2 text-muted-foreground text-xs">
                  <Clock className="h-3 w-3" />
                  Last activity {format(new Date(prospect.last_activity_at), "dd MMM yyyy")}
                </div>
              )}
            </div>

            {/* Summary */}
            {prospect.summary && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Summary</h4>
                <p className="text-sm">{prospect.summary}</p>
              </div>
            )}

            {/* Nurture / disqualified reasons */}
            {prospect.nurture_reason && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Nurture Reason</h4>
                <p className="text-sm">{prospect.nurture_reason}</p>
              </div>
            )}
            {prospect.disqualified_reason && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Disqualified Reason</h4>
                <p className="text-sm">{prospect.disqualified_reason}</p>
              </div>
            )}

            <Separator />

            {/* Notes */}
            <ProspectNotesSection prospectId={prospect.id} readOnly={isConverted} />

            <Separator />

            {/* Activity */}
            <ProspectActivityLog prospectId={prospect.id} readOnly={isConverted} />

            <Separator />

            {/* Actions */}
            {!isConverted && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {isQualified && (
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => setConvertOpen(true)}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Convert to Deal
                    </Button>
                  )}
                  {!isDisqualified && prospect.stage !== "nurture" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={handleMoveToNurture}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Move to Nurture
                    </Button>
                  )}
                  {!isDisqualified && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={handleDisqualify}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Disqualify
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Converted indicator */}
            {isConverted && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                This prospect was converted to a deal on{" "}
                {prospect.converted_at
                  ? format(new Date(prospect.converted_at), "dd MMM yyyy")
                  : "an unknown date"}
                .
              </div>
            )}

            {canDeleteProspect(userRole) && (
              <>
                <Separator />

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive w-full"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Prospect
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ProspectDialog open={editOpen} onClose={() => setEditOpen(false)} prospect={prospect} />

      <ConvertProspectToDealDialog
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        prospect={prospect}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{prospect.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
