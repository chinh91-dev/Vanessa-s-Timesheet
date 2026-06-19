import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format

    console.log(`Running auto-complete meeting tasks at ${now.toISOString()}`);
    console.log(`Checking for meetings on or before ${today} with end time before ${currentTime}`);

    // Find scheduled meetings where meeting_date is today or earlier
    // and end_time has passed (or no end_time and start_time + 1 hour has passed)
    const { data: overdueMeetings, error: meetingsError } = await supabase
      .from("crm_meetings")
      .select("id, title, meeting_date, start_time, end_time, owner_id, contact_name, account_id")
      .eq("status", "scheduled")
      .lte("meeting_date", today);

    if (meetingsError) {
      console.error("Error fetching meetings:", meetingsError);
      throw meetingsError;
    }

    console.log(`Found ${overdueMeetings?.length || 0} scheduled meetings on or before today`);

    const completedMeetings: string[] = [];
    const completedTasks: string[] = [];

    for (const meeting of overdueMeetings || []) {
      // Calculate meeting end datetime
      let meetingEndTime: Date;
      
      if (meeting.end_time) {
        // Use end_time if specified
        meetingEndTime = new Date(`${meeting.meeting_date}T${meeting.end_time}`);
      } else {
        // Default to start_time + 1 hour
        const startTime = new Date(`${meeting.meeting_date}T${meeting.start_time}`);
        meetingEndTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      }

      // Check if meeting has ended
      if (meetingEndTime < now) {
        console.log(`Meeting "${meeting.title}" (${meeting.id}) has ended at ${meetingEndTime.toISOString()}`);

        // Mark meeting as completed
        const { error: updateMeetingError } = await supabase
          .from("crm_meetings")
          .update({ 
            status: "completed",
            updated_at: now.toISOString(),
          })
          .eq("id", meeting.id);

        if (updateMeetingError) {
          console.error(`Failed to update meeting ${meeting.id}:`, updateMeetingError);
          continue;
        }

        completedMeetings.push(meeting.id);

        // Find and complete associated tasks
        const { data: meetingTasks, error: tasksError } = await supabase
          .from("tasks")
          .select("id, title, assigned_to")
          .eq("meeting_id", meeting.id)
          .eq("status", "pending");

        if (tasksError) {
          console.error(`Failed to fetch tasks for meeting ${meeting.id}:`, tasksError);
          continue;
        }

        console.log(`Found ${meetingTasks?.length || 0} pending tasks for meeting ${meeting.id}`);

        for (const task of meetingTasks || []) {
          const { error: updateTaskError } = await supabase
            .from("tasks")
            .update({
              status: "completed",
              completed_at: now.toISOString(),
              completion_notes: "Auto-completed when meeting ended",
            })
            .eq("id", task.id);

          if (updateTaskError) {
            console.error(`Failed to update task ${task.id}:`, updateTaskError);
            continue;
          }

          completedTasks.push(task.id);
          console.log(`Completed task: ${task.title} (${task.id})`);
        }
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      completedMeetings: completedMeetings.length,
      completedTasks: completedTasks.length,
      meetingIds: completedMeetings,
      taskIds: completedTasks,
    };

    console.log("Auto-complete result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in auto-complete-meeting-tasks:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
