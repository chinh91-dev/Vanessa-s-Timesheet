import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "support@comansservices.com.au";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  account_id: string | null;
  deal_id: string | null;
  profiles: { full_name: string; email: string } | null;
  accounts: { name: string } | null;
  deals: { name: string } | null;
}

interface GroupedTasks {
  [userId: string]: {
    email: string;
    fullName: string;
    tasks: Task[];
  };
}

const priorityOrder = { high: 1, medium: 2, low: 3 };
const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
}

function getWeekDateRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  const label = `${monday.toLocaleDateString("en-AU", { month: "short", day: "numeric" })}-${sunday.toLocaleDateString("en-AU", { day: "numeric" })}`;
  
  return { start: monday, end: sunday, label };
}

function getTodayDate(): string {
  const now = new Date();
  const aestOffset = 10 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const aestTime = new Date(utcTime + aestOffset * 60000);
  return aestTime.toISOString().split("T")[0];
}

function generateAdminSummaryHtml(groupedTasks: GroupedTasks, reminderType: string, dateLabel: string, appBaseUrl: string): string {
  const totalTasks = Object.values(groupedTasks).reduce((sum, user) => sum + user.tasks.length, 0);
  const userCount = Object.keys(groupedTasks).length;
  
  const userSections = Object.entries(groupedTasks).map(([userId, userData]) => {
    const highCount = userData.tasks.filter(t => t.priority === "high").length;
    const mediumCount = userData.tasks.filter(t => t.priority === "medium").length;
    const lowCount = userData.tasks.filter(t => t.priority === "low" || !t.priority).length;
    
    const taskDetails = userData.tasks
      .sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 3))
      .map(task => {
        const emoji = priorityEmoji[task.priority as keyof typeof priorityEmoji] || "🟢";
        const context = task.deals?.name ? `Deal: ${task.deals.name}` : 
                        task.accounts?.name ? `Account: ${task.accounts.name}` : "";
        return `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
              <span style="margin-right: 6px;">${emoji}</span>
              ${task.title}
              <span style="color: #9ca3af; margin-left: 8px;">${formatDate(task.due_date)}</span>
              ${context ? `<br><span style="color: #9ca3af; font-size: 12px; margin-left: 20px;">${context}</span>` : ""}
            </td>
          </tr>
        `;
      }).join("");
    
    return `
      <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827; font-size: 15px;">${userData.fullName}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${userData.email}</div>
          <div style="margin-top: 8px;">
            ${highCount > 0 ? `<span style="display: inline-block; background-color: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px;">🔴 ${highCount} High</span>` : ""}
            ${mediumCount > 0 ? `<span style="display: inline-block; background-color: #fefce8; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px;">🟡 ${mediumCount} Medium</span>` : ""}
            ${lowCount > 0 ? `<span style="display: inline-block; background-color: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 4px; font-size: 12px;">🟢 ${lowCount} Low</span>` : ""}
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${taskDetails}
        </table>
      </div>
    `;
  }).join("");

  const reportTitle = reminderType === "weekly" ? "Weekly Team Task Summary" : "Daily Team Task Summary";
  const headerColor = reminderType === "weekly" ? "#8b5cf6" : "#6366f1";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background-color: ${headerColor}; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 ${reportTitle}</h1>
          <p style="color: #e9d5ff; margin: 8px 0 0 0; font-size: 14px;">${dateLabel}</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="color: #374151; margin: 0 0 20px 0;">Hi Team,</p>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
            <div style="display: inline-block; margin: 0 20px;">
              <div style="font-size: 28px; font-weight: 700; color: #111827;">${totalTasks}</div>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Tasks</div>
            </div>
            <div style="display: inline-block; margin: 0 20px;">
              <div style="font-size: 28px; font-weight: 700; color: #111827;">${userCount}</div>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Team Members</div>
            </div>
          </div>
          
          <h2 style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">Tasks by Team Member</h2>
          
          ${userSections}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${appBaseUrl}/crm/tasks" style="display: inline-block; background-color: ${headerColor}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View All Tasks</a>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">This is an automated admin summary report.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-crm-task-reminders function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reminderType } = await req.json();
    console.log("Reminder type:", reminderType);

    if (!reminderType || !["weekly", "daily"].includes(reminderType)) {
      throw new Error("Invalid reminderType. Must be 'weekly' or 'daily'");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://timesheet.comans.services";

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let query = supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        assigned_to,
        account_id,
        deal_id,
        profiles:assigned_to(full_name, email),
        accounts:account_id(name),
        deals:deal_id(name)
      `)
      .not("status", "in", "(completed,cancelled)")
      .not("assigned_to", "is", null)
      .not("due_date", "is", null);

    if (reminderType === "weekly") {
      const { start, end } = getWeekDateRange();
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      query = query.gte("due_date", startStr).lte("due_date", endStr);
      console.log(`Fetching weekly tasks from ${startStr} to ${endStr}`);
    } else {
      const today = getTodayDate();
      query = query.eq("due_date", today);
      console.log(`Fetching daily tasks for ${today}`);
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} tasks`);

    if (!tasks || tasks.length === 0) {
      console.log("No tasks found for the reminder period");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No tasks found", 
          emailsSent: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group tasks by user
    const groupedTasks: GroupedTasks = {};
    for (const task of tasks) {
      const userId = task.assigned_to;
      const profile = task.profiles as { full_name: string; email: string } | null;
      
      if (!profile?.email) {
        console.log(`Skipping task ${task.id} - no email for user ${userId}`);
        continue;
      }

      if (!groupedTasks[userId]) {
        groupedTasks[userId] = {
          email: profile.email,
          fullName: profile.full_name || "Team Member",
          tasks: [],
        };
      }
      groupedTasks[userId].tasks.push(task as Task);
    }

    if (Object.keys(groupedTasks).length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No tasks with valid users", emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send single summary email to support
    const dateLabel = reminderType === "weekly" 
      ? getWeekDateRange().label 
      : new Date().toLocaleDateString("en-AU", { weekday: "long", month: "long", day: "numeric" });

    const html = generateAdminSummaryHtml(groupedTasks, reminderType, dateLabel, appBaseUrl);
    const totalTasks = Object.values(groupedTasks).reduce((sum, user) => sum + user.tasks.length, 0);
    const subject = reminderType === "weekly"
      ? `📊 Weekly CRM Task Summary (${totalTasks} tasks) - ${dateLabel}`
      : `📊 Daily CRM Task Summary (${totalTasks} tasks) - ${new Date().toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`;

    console.log(`Sending task summary to ${SUPPORT_EMAIL}`);

    const emailResponse = await resend.emails.send({
      from: "CRM Admin Reports <crm@comansservices.com.au>",
      to: [SUPPORT_EMAIL],
      subject,
      html,
    });

    console.log(`Summary email sent to ${SUPPORT_EMAIL}:`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: 1,
        totalUsers: Object.keys(groupedTasks).length,
        totalTasks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-crm-task-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
