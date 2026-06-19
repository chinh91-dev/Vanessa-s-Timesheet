import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface StageMoveNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  fromStageName: string;
  toStageName: string;
  dealName: string;
  isSubmitting?: boolean;
}

export function StageMoveNoteDialog({
  open,
  onClose,
  onConfirm,
  fromStageName,
  toStageName,
  dealName,
  isSubmitting = false,
}: StageMoveNoteDialogProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!note.trim()) {
      setError("Please add a note before moving the deal");
      return;
    }
    setError(null);
    onConfirm(note.trim());
  };

  const handleClose = () => {
    setNote("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fromStageName} Note Required</DialogTitle>
          <DialogDescription>
            Add a note for <strong>{dealName}</strong> before moving from{" "}
            <strong>{fromStageName}</strong> to <strong>{toStageName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Label htmlFor="stage-move-note">
            What happened in {fromStageName}? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="stage-move-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError(null);
            }}
            placeholder={`Summarize the ${fromStageName} stage activities...`}
            className={error ? "border-destructive" : ""}
            rows={4}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Moving..." : "Confirm Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
