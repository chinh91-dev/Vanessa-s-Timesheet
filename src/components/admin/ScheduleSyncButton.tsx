import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { syncWeeklySchedulesWithProfiles } from "@/lib/work-schedule-sync-service";

interface ScheduleSyncButtonProps {
  weekStartDate: Date;
  userIds?: string[];
  onSyncComplete?: () => void;
}

const ScheduleSyncButton: React.FC<ScheduleSyncButtonProps> = ({
  weekStartDate,
  userIds,
  onSyncComplete
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncWeeklySchedulesWithProfiles(weekStartDate, userIds);
      
      toast({
        title: "Schedule Sync Complete",
        description: `Synced: ${result.synced}, Skipped: ${result.skipped}, Errors: ${result.errors}`,
        variant: result.errors > 0 ? "destructive" : "default",
      });

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error("Error syncing schedules:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync weekly schedules with user profiles.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      {isSyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {isSyncing ? "Syncing..." : "Sync with Profiles"}
    </Button>
  );
};

export default ScheduleSyncButton;