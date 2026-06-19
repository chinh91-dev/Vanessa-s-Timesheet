import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import type { CRMMeeting, CRMMeetingNote, CreateMeetingDTO, UpdateMeetingDTO, CreateMeetingNoteDTO } from "@/lib/crm/types";

const MEETINGS_KEY = "crm-meetings";
const MEETING_NOTES_KEY = "crm-meeting-notes";

// Fetch meetings with optional filters
export function useMeetings(filters?: { year?: number; month?: number; type?: string; status?: string }) {
  return useQuery({
    queryKey: [MEETINGS_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_meetings")
        .select(`
          *,
          contact:contact_id(id, company_name, contact_name, email, phone),
          account:account_id(id, name, email, phone),
          deal:deal_id(id, name),
          prospect:prospect_id(id, name, stage),
          owner:owner_id(id, full_name, email)
        `)
        .order("meeting_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (filters?.year && filters?.month) {
        const startDate = formatDate(new Date(filters.year, filters.month - 1, 1));
        const endDate = formatDate(new Date(filters.year, filters.month, 0));
        query = query.gte("meeting_date", startDate).lte("meeting_date", endDate);
      }

      if (filters?.type) {
        query = query.eq("meeting_type", filters.type);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CRMMeeting[];
    },
  });
}

// Fetch meetings for a specific month (calendar view)
export function useMeetingsByMonth(year: number, month: number) {
  return useMeetings({ year, month });
}

// Fetch upcoming meetings
export function useUpcomingMeetings(limit: number = 5) {
  return useQuery({
    queryKey: [MEETINGS_KEY, "upcoming", limit],
    queryFn: async () => {
      const today = formatDate(new Date());
      const { data, error } = await supabase
        .from("crm_meetings")
        .select(`
          *,
          contact:contact_id(id, company_name, contact_name),
          account:account_id(id, name),
          prospect:prospect_id(id, name, stage),
          owner:owner_id(id, full_name)
        `)
        .gte("meeting_date", today)
        .eq("status", "scheduled")
        .order("meeting_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as CRMMeeting[];
    },
  });
}

// Fetch single meeting with notes
export function useMeeting(id: string | null) {
  return useQuery({
    queryKey: [MEETINGS_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("crm_meetings")
        .select(`
          *,
          contact:contact_id(id, company_name, contact_name, email, phone),
          account:account_id(id, name, email, phone),
          deal:deal_id(id, name),
          prospect:prospect_id(id, name, stage),
          owner:owner_id(id, full_name, email)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as CRMMeeting;
    },
    enabled: !!id,
  });
}

// Fetch meeting notes
export function useMeetingNotes(meetingId: string | null) {
  return useQuery({
    queryKey: [MEETING_NOTES_KEY, meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from("crm_meeting_notes")
        .select(`
          *,
          creator:created_by(id, full_name)
        `)
        .eq("meeting_id", meetingId)
        .order("note_date", { ascending: false });

      if (error) throw error;
      return data as CRMMeetingNote[];
    },
    enabled: !!meetingId,
  });
}

// Create meeting with auto-generated task
export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMeetingDTO) => {
      const { data: meeting, error } = await supabase
        .from("crm_meetings")
        .insert(data)
        .select(`
          *,
          contact:contact_id(id, contact_name),
          account:account_id(id, name),
          prospect:prospect_id(id, name, stage)
        `)
        .single();

      if (error) throw error;
      return meeting;
    },
    onSuccess: async (meeting) => {
      // Determine contact name for task title
      const contactName = 
        meeting.contact_name || 
        meeting.contact?.contact_name || 
        meeting.account?.name || 
        "Contact";

      const taskTitle = `Meeting with ${contactName}`;

      try {
        // Get current user for task assignment
        const { data: { user } } = await supabase.auth.getUser();

        // Auto-create task for the meeting
        const { error: taskError } = await supabase.from("tasks").insert({
          title: taskTitle,
          due_date: meeting.meeting_date,
          original_due_date: meeting.meeting_date,
          meeting_id: meeting.id,
          is_auto_generated: true,
          status: "pending",
          priority: "medium",
          assigned_to: meeting.owner_id || user?.id,
          description: `Auto-created task for meeting: ${meeting.title}`,
          account_id: meeting.account_id,
        });

        if (taskError) {
          console.error("Failed to create meeting task:", taskError);
        }

        queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      } catch (taskErr) {
        console.error("Error creating meeting task:", taskErr);
      }

      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
      toast({ 
        title: "Meeting created successfully",
        description: `Task "${taskTitle}" has been created`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create meeting", description: error.message, variant: "destructive" });
    },
  });
}

// Update meeting
export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMeetingDTO }) => {
      const { data: meeting, error } = await supabase
        .from("crm_meetings")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
      toast({ title: "Meeting updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update meeting", description: error.message, variant: "destructive" });
    },
  });
}

// Delete meeting
export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
      toast({ title: "Meeting deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete meeting", description: error.message, variant: "destructive" });
    },
  });
}

// Create meeting note
export function useCreateMeetingNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMeetingNoteDTO) => {
      const { data: note, error } = await supabase
        .from("crm_meeting_notes")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEETING_NOTES_KEY, variables.meeting_id] });
      toast({ title: "Note added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add note", description: error.message, variant: "destructive" });
    },
  });
}

// Delete meeting note
export function useDeleteMeetingNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, meetingId }: { id: string; meetingId: string }) => {
      const { error } = await supabase.from("crm_meeting_notes").delete().eq("id", id);
      if (error) throw error;
      return meetingId;
    },
    onSuccess: (meetingId) => {
      queryClient.invalidateQueries({ queryKey: [MEETING_NOTES_KEY, meetingId] });
      toast({ title: "Note deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete note", description: error.message, variant: "destructive" });
    },
  });
}

// Reschedule meeting (reset status to scheduled with new date/time)
export function useRescheduleMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      newDate,
      newStartTime,
      newEndTime,
    }: {
      id: string;
      newDate: string;
      newStartTime: string;
      newEndTime?: string;
    }) => {
      // Update meeting with new date/time and reset status to scheduled
      const { data: meeting, error } = await supabase
        .from("crm_meetings")
        .update({
          meeting_date: newDate,
          start_time: newStartTime,
          end_time: newEndTime || null,
          status: "scheduled",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update associated task due date and reset status
      await supabase
        .from("tasks")
        .update({
          due_date: newDate,
          status: "pending",
        })
        .eq("meeting_id", id);

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      toast({ title: "Meeting rescheduled successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reschedule meeting",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
