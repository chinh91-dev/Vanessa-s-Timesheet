import { format } from "date-fns";
import { MessageSquare, Clock, User, Tag } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDealStageNotes, LOST_REASONS } from "@/hooks/crm/useDealStageNotes";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DealStageNotesSectionProps {
  dealId: string;
  currentStageId: string;
  currentStageName: string;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
  /** Allow adding new notes */
  canAddNote?: boolean;
  /** Controlled note value from parent */
  noteValue?: string;
  /** Callback when note changes */
  onNoteChange?: (value: string) => void;
  /** Whether this is a new deal being created */
  isNewDeal?: boolean;
  /** Whether the note is required */
  isRequired?: boolean;
}

export function DealStageNotesSection({
  dealId,
  currentStageId,
  currentStageName,
  isClosedWon,
  isClosedLost,
  canAddNote = true,
  noteValue = "",
  onNoteChange,
  isNewDeal = false,
  isRequired = false,
}: DealStageNotesSectionProps) {
  const { data: notes, isLoading } = useDealStageNotes(isNewDeal ? undefined : dealId);

  // Get placeholder text based on stage
  const getPlaceholderText = () => {
    if (isClosedWon) return "Why did we win this deal? What made us successful?";
    if (isClosedLost) return "Why did we lose this deal?";
    return "Add a note about this stage...";
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
        <h4 className="font-medium text-sm">Stage Notes</h4>
        <Badge variant="secondary" className="text-xs">
          {notes?.length || 0}
        </Badge>
      </div>

      {/* Add new note form - controlled by parent */}
      {canAddNote && (
        <Textarea
          value={noteValue}
          onChange={(e) => onNoteChange?.(e.target.value)}
          placeholder={getPlaceholderText()}
          className={cn(
            "min-h-[80px] resize-none"
          )}
        />
      )}

      {/* Notes list */}
      {notes && notes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-muted/50 rounded-lg p-3 space-y-2"
              >
                {/* Note header */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <Badge variant="outline" className="text-xs py-0">
                      {note.stage_name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{note.created_by_name}</span>
                  </div>
                </div>

                {/* Lost reason badge if applicable */}
                {note.lost_reason && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {LOST_REASONS.find(r => r.value === note.lost_reason)?.label || note.lost_reason}
                    </Badge>
                    {note.lost_reason === "other" && note.lost_reason_other && (
                      <span className="text-xs text-muted-foreground italic">
                        {note.lost_reason_other}
                      </span>
                    )}
                  </div>
                )}

                {/* Note content */}
                <p className="text-sm whitespace-pre-wrap">{note.note_content}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {(!notes || notes.length === 0) && !canAddNote && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No stage notes yet
        </p>
      )}
    </div>
  );
}
