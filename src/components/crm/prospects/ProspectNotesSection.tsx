import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Clock, User, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProspectNotes, useCreateProspectNote } from "@/hooks/crm/useProspectNotes";

interface ProspectNotesSectionProps {
  prospectId: string;
  readOnly?: boolean;
}

export function ProspectNotesSection({ prospectId, readOnly = false }: ProspectNotesSectionProps) {
  const [newNote, setNewNote] = useState("");
  const { data: notes, isLoading } = useProspectNotes(prospectId);
  const createNote = useCreateProspectNote();

  const handleSubmit = async () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;

    await createNote.mutateAsync({
      prospect_id: prospectId,
      note_content: trimmed,
    });
    setNewNote("");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Notes</h4>
        <Badge variant="secondary" className="text-xs">
          {notes?.length || 0}
        </Badge>
      </div>

      {!readOnly && (
        <div className="space-y-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!newNote.trim() || createNote.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {createNote.isPending ? "Saving..." : "Add Note"}
            </Button>
          </div>
        </div>
      )}

      {notes && notes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {notes.map((note) => (
              <div key={note.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{note.created_by_name}</span>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.note_content}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {(!notes || notes.length === 0) && readOnly && (
        <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
      )}
    </div>
  );
}
