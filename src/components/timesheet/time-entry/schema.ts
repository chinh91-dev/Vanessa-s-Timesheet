
import * as z from "zod";

export const timeEntryFormSchema = z.object({
  entry_type: z.enum(["project", "contract"], { 
    required_error: "Please select either Project or Contract" 
  }),
  project_id: z.string().optional(),
  contract_id: z.string().optional(),
  hours_logged: z.coerce.number().min(0.01, { message: "Hours must be greater than 0" }).max(24, { message: "Hours cannot exceed 24" }),
  notes: z.string().min(1, { message: "Notes are required" }),
  jira_task_id: z.string().min(1, { message: "Task ID is required" }),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  // New fields for incident linking
  task_mode: z.enum(["manual", "incident"]).default("manual"),
  incident_id: z.string().optional(),
}).refine(
  (data) => {
    if (data.entry_type === "project") {
      return data.project_id && data.project_id.length > 0;
    }
    if (data.entry_type === "contract") {
      return data.contract_id && data.contract_id.length > 0;
    }
    return false;
  },
  {
    message: "Please select a project or contract",
    path: ["project_id"],
  }
);

export type TimeEntryFormValues = z.infer<typeof timeEntryFormSchema>;
