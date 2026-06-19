import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Clock, User, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactNotes, useCreateContactNote } from "@/hooks/crm/useContactNotes";

interface ContactNotesSectionProps {
  /** ID of the existing contact. If undefined, renders a simple textarea for initial note. */
  contactId?: string;
  /** Controlled value used when contactId is not yet known (new contact flow) */
  initialNoteValue?: string;
  /** Callback for initial note changes (new contact flow) */
  onInitialNoteChange?: (value: string) => void;
  /** Disable adding new notes (read-only view) */
  readOnly?: boolean;
}

export function ContactNotesSection({
  contactId,
  initialNoteValue = "",
  onInitialNoteChange,
  readOnly = false,
}: ContactNotesSectionProps) {
  const [newNote, setNewNote] = useState("");
  const { data: notes, isLoading } = useContactNotes(contactId);
  const createNote = useCreateContactNote();

  const handleSubmit = async () => {
    const trimmed = newNote.trim();
    if (!trimmed || !contactId) return;

    await createNote.mutateAsync({
      contact_id: contactId,
      note_content: trimmed,
    });
    setNewNote("");
  };

  // New contact — just show a simple controlled textarea
  if (!contactId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">Notes</h4>
        </div>
        <Textarea
          value={initialNoteValue}
          onChange={(e) => onInitialNoteChange?.(e.target.value)}
          placeholder="Add an initial note about this contact (optional)"
          className="min-h-[80px] resize-none"
          disabled={readOnly}
        />
      </div>
    );
  }

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

      {/* Add new note */}
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

      {/* Notes trail */}
      {notes && notes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {notes?.map((note) => (
              <div
                key={note.id}
                className="bg-muted/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
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
        <p className="text-sm text-muted-foreground text-center py-4">
          No notes yet
        </p>
      )}
    </div>
  );
}
