import React, { useState } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, ArrowRight, Bell } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMeetingNotes, useCreateMeetingNote } from "@/hooks/crm/useMeetings";
import { MEETING_NOTE_TYPES } from "@/lib/crm/constants";
import type { MeetingNoteType, CRMMeetingNote } from "@/lib/crm/types";

interface MeetingNotesSectionProps {
  meetingId: string;
}

const NoteIcon: React.FC<{ type: MeetingNoteType }> = ({ type }) => {
  switch (type) {
    case "summary":
      return <FileText className="h-4 w-4" />;
    case "follow_up":
      return <ArrowRight className="h-4 w-4" />;
    case "reminder":
      return <Bell className="h-4 w-4" />;
  }
};

const MeetingNotesSection: React.FC<MeetingNotesSectionProps> = ({ meetingId }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [noteType, setNoteType] = useState<MeetingNoteType>("summary");
  const [content, setContent] = useState("");

  const { data: notes = [], isLoading } = useMeetingNotes(meetingId);
  const createNote = useCreateMeetingNote();

  const handleAddNote = () => {
    if (!content.trim()) return;

    createNote.mutate(
      {
        meeting_id: meetingId,
        note_type: noteType,
        content: content.trim(),
        note_date: todayLocalYMD(),
      },
      {
        onSuccess: () => {
          setContent("");
          setIsAdding(false);
        },
      }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Meeting Notes
        </h4>
        {!isAdding && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add note form */}
      {isAdding && (
        <div className="mb-4 p-3 border rounded-lg bg-muted/30">
          <div className="mb-3">
            <Select value={noteType} onValueChange={(v) => setNoteType(v as MeetingNoteType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MEETING_NOTE_TYPES) as MeetingNoteType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <NoteIcon type={type} />
                      {MEETING_NOTE_TYPES[type].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Add your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNote} disabled={!content.trim() || createNote.isPending}>
              {createNote.isPending ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notes yet. Add your first note above.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="relative group p-3 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-muted">
                  <NoteIcon type={note.note_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {MEETING_NOTE_TYPES[note.note_type].label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {format(parseISO(note.note_date), "d MMM yyyy")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  {note.creator && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {note.creator.full_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingNotesSection;
