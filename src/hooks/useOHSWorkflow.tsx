import { useState, useCallback } from 'react';
import { OHSWorkflowService } from '@/lib/ohs/workflow-service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useOHSWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const changeStatus = useCallback(async (
    entityType: 'hazard' | 'inspection' | 'injury',
    entityId: string,
    newStatus: string,
    notes?: string
  ) => {
    setLoading(true);
    try {
      const result = await OHSWorkflowService.processStatusChange(
        entityType,
        entityId,
        newStatus,
        notes,
        user?.id
      );

      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Status changed to ${newStatus} successfully.`,
        });
        return true;
      } else {
        toast({
          title: "Status Change Failed",
          description: result.error || "Failed to change status",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const generateComplianceReport = useCallback(async (dateRange: { start: string; end: string }) => {
    setLoading(true);
    try {
      const report = await OHSWorkflowService.generateComplianceReport(dateRange);
      toast({
        title: "Report Generated",
        description: "Compliance report has been generated successfully.",
      });
      return report;
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate compliance report",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const processEscalations = useCallback(async () => {
    setLoading(true);
    try {
      await OHSWorkflowService.processAutoEscalations();
      toast({
        title: "Escalations Processed",
        description: "Auto-escalations have been processed successfully.",
      });
    } catch (error) {
      toast({
        title: "Escalation Processing Failed",
        description: "Failed to process escalations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const processPeriodicReviews = useCallback(async () => {
    setLoading(true);
    try {
      await OHSWorkflowService.processPeriodicReviews();
      toast({
        title: "Reviews Processed",
        description: "Periodic reviews have been processed successfully.",
      });
    } catch (error) {
      toast({
        title: "Review Processing Failed",
        description: "Failed to process periodic reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    changeStatus,
    generateComplianceReport,
    processEscalations,
    processPeriodicReviews,
  };
};