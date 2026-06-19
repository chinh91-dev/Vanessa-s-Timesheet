import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { resetAllWeeklySchedulesToTemplate } from "@/lib/work-schedule-sync-service";

interface ScheduleResetButtonProps {
  onResetComplete?: () => void;
}

const ScheduleResetButton: React.FC<ScheduleResetButtonProps> = ({
  onResetComplete
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetAllWeeklySchedulesToTemplate();
      
      toast({
        title: "Reset Complete",
        description: `Deleted ${result.deleted} weekly schedule override${result.deleted !== 1 ? 's' : ''} across all weeks.`,
      });

      setIsOpen(false);
      
      if (onResetComplete) {
        onResetComplete();
      }
    } catch (error) {
      console.error("Error resetting schedules:", error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset weekly schedules to templates.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset All to Templates
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset All Schedules?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete ALL weekly schedule overrides for EVERY week and revert everyone to their default templates across all time periods.
            <br /><br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isResetting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isResetting ? "Resetting..." : "Reset All Weeks"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ScheduleResetButton;
