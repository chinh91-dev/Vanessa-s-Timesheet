import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const ManualReminderTrigger = () => {
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const { userRole } = useAuth();
  const { toast } = useToast();

  // Only show for admins
  if (userRole !== 'admin') {
    return null;
  }

  const handleTriggerReminder = async () => {
    setIsLoadingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-location-reminders', {
        body: {
          testMode: true, // Safe test mode
          scheduled: false // Manual trigger
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Location Reminders Triggered",
        description: `Successfully processed ${data?.totalUsers || 0} users. Sent: ${data?.remindersSent || 0}, Skipped: ${data?.remindersSkipped || 0}, Errors: ${data?.errors || 0}`,
      });

      console.log('Manual reminder result:', data);
    } catch (error) {
      console.error('Error triggering reminders:', error);
      toast({
        title: "Error",
        description: "Failed to trigger location reminders. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReminders(false);
    }
  };

  const handleTriggerReport = async () => {
    setIsLoadingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-location-status-report', {
        body: {
          testMode: true // Safe test mode
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Location Status Report Triggered",
        description: `Report generated successfully! Total employees: ${data?.summary?.total_employees || 0}, Confirmed: ${data?.summary?.confirmed || 0}, Pending: ${data?.summary?.not_confirmed || 0}`,
      });

      console.log('Manual report result:', data);
    } catch (error) {
      console.error('Error triggering report:', error);
      toast({
        title: "Error",
        description: "Failed to trigger location status report. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <Mail className="h-5 w-5" />
            Manual Location Reminder Test
          </CardTitle>
          <CardDescription className="text-orange-700 dark:text-orange-300">
            Test the daily location reminder email system. This will run in test mode (no actual emails sent).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleTriggerReminder}
            disabled={isLoadingReminders}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {isLoadingReminders ? "Triggering..." : "Test Location Reminders"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Mail className="h-5 w-5" />
            Manual Location Status Report Test
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Test the daily location status report email system. This will run in test mode (test email).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleTriggerReport}
            disabled={isLoadingReport}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {isLoadingReport ? "Generating Report..." : "Test Location Status Report"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualReminderTrigger;