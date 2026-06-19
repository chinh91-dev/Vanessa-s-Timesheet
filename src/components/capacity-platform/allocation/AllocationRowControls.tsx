// ============================================================================
// AllocationRowControls — sub-row label + delete control
// ----------------------------------------------------------------------------
// Renders the customer + work_type label cell at the start of each
// allocation sub-row inside a person group, plus a trash button at the end
// that opens an AlertDialog confirmation.
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import type { WorkType } from "@/lib/capacity-platform/types";

const WORK_TYPE_VARIANT: Record<
  WorkType,
  "default" | "secondary" | "outline" | "destructive"
> = {
  BAU: "secondary",
  Project: "default",
  Onboarding: "outline",
  Escalation: "destructive",
  Internal: "outline",
};

export interface AllocationRowLabelProps {
  customer: string | null;
  workType: WorkType;
}

export const AllocationRowLabel = ({
  customer,
  workType,
}: AllocationRowLabelProps) => (
  <div className="flex flex-col gap-1 text-sm">
    <span className="font-medium">{customer || "(unspecified)"}</span>
    <Badge variant={WORK_TYPE_VARIANT[workType]} className="w-fit text-[10px]">
      {workType}
    </Badge>
  </div>
);

export interface AllocationRowDeleteButtonProps {
  rowLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export const AllocationRowDeleteButton = ({
  rowLabel,
  onConfirm,
  disabled = false,
}: AllocationRowDeleteButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={`Delete allocation row ${rowLabel}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete allocation row?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the {rowLabel} allocation for this week.
              You can recreate it from "+ Add allocation".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
