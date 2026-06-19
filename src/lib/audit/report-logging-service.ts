
import { supabase } from "@/integrations/supabase/client";
import type { ReportGenerationDetails } from "./types";

/**
 * Log report generation audit event using secure database function
 */
export const logReportGeneration = async (reportDetails: ReportGenerationDetails): Promise<void> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      console.warn("No authenticated user for audit logging");
      return;
    }

    // Use the secure database function for logging
    const { error: logError } = await supabase.rpc('log_report_generation_secure', {
      p_report_type: reportDetails.reportType,
      p_filters: {
        ...reportDetails.filters,
        startDate: reportDetails.filters.startDate,
        endDate: reportDetails.filters.endDate
      },
      p_result_count: reportDetails.resultCount
    });

    if (logError) {
      console.error("Error logging report generation:", logError);
    } else {
      console.log("Report generation logged to audit trail via secure database function");
    }
  } catch (error) {
    console.error("Error in logReportGeneration:", error);
  }
};
