import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MessageSquare, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TaskNote {
  id: string;
  task_id: string;
  content: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

interface TaskNoteSectionProps {
  taskId: string;
}

export function TaskNoteSection({ taskId }: TaskNoteSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch notes for this task
  const { data: notes, isLoading } = useQuery({
    queryKey: ["task-notes", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_notes")
        .select(`
          id,
          task_id,
          content,
          created_by,
          created_at
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === "42P01") {
          return [];
        }
        throw error;
      }

      // Fetch user names for notes
      const userIds = [...new Set(data?.map((n) => n.created_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]));
        return data?.map((note) => ({
          ...note,
          created_by_name: profileMap.get(note.created_by) || "Unknown User",
        })) as TaskNote[];
      }

      return data as TaskNote[];
    },
    enabled: !!taskId,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("task_notes").insert({
        task_id: taskId,
        content,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notes", taskId] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      await addNoteMutation.mutateAsync(newNote.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
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

      {/* Add new note form */}
      <div className="space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Note"}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {notes && notes.length > 0 && (
        <div className="space-y-3 max-h-[200px] overflow-y-auto">
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
                  <User className="h-3 w-3" />
                  <span>{note.created_by_name || "Unknown"}</span>
                </div>
              </div>

              {/* Note content */}
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!notes || notes.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No notes yet
        </p>
      )}
    </div>
  );
}
