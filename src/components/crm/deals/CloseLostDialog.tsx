import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { LOST_REASONS, LostReason, useCreateDealStageNote } from "@/hooks/crm/useDealStageNotes";
import { useToast } from "@/hooks/use-toast";

interface CloseLostDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { reason: LostReason; reasonOther?: string; notes: string }) => Promise<void>;
  dealName: string;
  dealId: string;
  stageId: string;
  stageName: string;
}

export function CloseLostDialog({
  open,
  onClose,
  onConfirm,
  dealName,
  dealId,
  stageId,
  stageName,
}: CloseLostDialogProps) {
  const [reason, setReason] = useState<LostReason | "">("");
  const [reasonOther, setReasonOther] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createNote = useCreateDealStageNote();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for losing this deal",
        variant: "destructive",
      });
      return;
    }

    if (reason === "other" && !reasonOther.trim()) {
      toast({
        title: "Details required",
        description: "Please specify the reason for losing this deal",
        variant: "destructive",
      });
      return;
    }

    if (!notes.trim()) {
      toast({
        title: "Notes required",
        description: "Please add notes explaining why this deal was lost",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the stage note with lost reason
      await createNote.mutateAsync({
        deal_id: dealId,
        stage_id: stageId,
        stage_name: stageName,
        note_content: notes.trim(),
        lost_reason: reason,
        lost_reason_other: reason === "other" ? reasonOther.trim() : undefined,
      });

      // Call the confirm callback to proceed with the move
      await onConfirm({
        reason: reason as LostReason,
        reasonOther: reason === "other" ? reasonOther.trim() : undefined,
        notes: notes.trim(),
      });

      // Reset form
      setReason("");
      setReasonOther("");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Error marking deal as lost:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      setReasonOther("");
      setNotes("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Mark Deal as Lost
          </DialogTitle>
          <DialogDescription>
            You are about to mark <strong>{dealName}</strong> as lost. Please provide the reason and any additional notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason dropdown */}
          <div className="space-y-2">
            <Label htmlFor="lost-reason" className="text-sm font-medium">
              Reason for Loss <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={(value) => setReason(value as LostReason)}>
              <SelectTrigger id="lost-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Other reason text input */}
          {reason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="reason-other" className="text-sm font-medium">
                Please specify <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason-other"
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                placeholder="Enter the specific reason..."
                className="min-h-[60px]"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="lost-notes" className="text-sm font-medium">
              Why did we lose this deal? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="lost-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide details about why this deal was lost and any lessons learned..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason || !notes.trim()}
          >
            {isSubmitting ? "Saving..." : "Mark as Lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
