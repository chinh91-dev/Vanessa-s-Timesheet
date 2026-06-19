
import { useState } from "react";
import { usePipelineStages } from "@/hooks/crm/usePipelineStages";
import { useMoveDealToStage } from "@/hooks/crm/useDeals";
import { useCompleteTasksByDealId, useCreateTask } from "@/hooks/crm/useTasks";
import { useConvertAccountToCustomer } from "@/hooks/crm/useConvertAccountToCustomer";
import { canMoveToStage } from "@/lib/crm/pipeline-utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addBusinessDays, addDays, formatDateForDB } from "@/lib/crm/date-utils";
import type { PipelineItem, PipelineStage } from "@/lib/crm/types";

/**
 * Get auto-task configuration for stage transitions
 */
function getAutoTaskForTransition(
    fromStageOrder: number,
    toStageOrder: number,
    contactName: string | null
): { title: string; dueDays: number; useBusinessDays: boolean } | null {
    const name = contactName || "the contact";
    
    // Qualified (1) → Discovery (2): Follow up with {contact_name} - 2 calendar days
    if (fromStageOrder === 1 && toStageOrder === 2) {
        return { title: `Follow up with ${name}`, dueDays: 2, useBusinessDays: false };
    }
    
    // Discovery (2) → Proposal (3): Send the proposal to {contact_name} - 5 business days
    if (fromStageOrder === 2 && toStageOrder === 3) {
        return { title: `Send the proposal to ${name}`, dueDays: 5, useBusinessDays: true };
    }
    
    // Proposal (3) → Negotiation (4): Create the Contract - 10 business days
    if (fromStageOrder === 3 && toStageOrder === 4) {
        return { title: `Create the Contract`, dueDays: 10, useBusinessDays: true };
    }
    
    return null;
}

export function useDealMovement() {
    const [selectedDeal, setSelectedDeal] = useState<PipelineItem | undefined>();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingTargetStageId, setPendingTargetStageId] = useState<string | null>(null);
    const [dialogResetKey, setDialogResetKey] = useState(0);
    
    // Close Lost dialog state
    const [closeLostDialogOpen, setCloseLostDialogOpen] = useState(false);
    const [closeLostDealData, setCloseLostDealData] = useState<{
        deal: PipelineItem;
        targetStageId: string;
        targetStageName: string;
    } | null>(null);

    // Time entry dialog state for after deal moves
    const [timeEntryDialogOpen, setTimeEntryDialogOpen] = useState(false);
    const [timeEntryDealData, setTimeEntryDealData] = useState<{
        dealId: string;
        dealName: string;
        stageName: string;
        taskTitle: string;
    } | null>(null);

    const { data: stages } = usePipelineStages();
    const moveDeal = useMoveDealToStage();
    const completeTasksByDeal = useCompleteTasksByDealId();
    const createTask = useCreateTask();
    const convertToCustomer = useConvertAccountToCustomer();
    const { toast } = useToast();

    const activeStages = stages?.filter(stage => stage.is_active) || [];

    const executeDealMove = async (
        deal: PipelineItem,
        newStageId: string,
        currentStage: { stage_order: number; name: string },
        targetStage: { stage_order: number; name: string; is_closed_won?: boolean }
    ) => {
        try {
            // Complete existing tasks for this deal before moving (no note from drag-drop)
            await completeTasksByDeal.mutateAsync({ dealId: deal.id });

            // Check if target stage is Closed Won
            const isClosedWon = targetStage.is_closed_won === true;

            // Check if moving from Proposal/Solution (order 3) to Negotiation/Commit (order 4)
            const isProposalToNegotiation = currentStage.stage_order === 3 && targetStage.stage_order === 4;

            await moveDeal.mutateAsync({
                dealId: deal.id,
                stageId: newStageId,
                accountId: deal.account_id,
                primaryContactId: deal.primary_contact_id,
                isClosedWon,
                clearContractDetails: false,
            });

            // If moving to Negotiation, send legal review notification email
            if (isProposalToNegotiation) {
                try {
                    console.log("Sending legal review notification for deal:", deal.id);
                    const { error: emailError } = await supabase.functions.invoke('send-legal-review-notification', {
                        body: { dealId: deal.id }
                    });
                    if (emailError) {
                        console.error("Failed to send legal review notification:", emailError);
                    } else {
                        console.log("Legal review notification sent successfully");
                    }
                } catch (emailErr) {
                    console.error("Error sending legal review notification:", emailErr);
                }
            }

            // Auto-create task for stage transition
            const autoTask = getAutoTaskForTransition(
                currentStage.stage_order,
                targetStage.stage_order,
                deal.primary_contact_name || null
            );

            if (autoTask) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const dueDate = autoTask.useBusinessDays
                        ? addBusinessDays(new Date(), autoTask.dueDays)
                        : addDays(new Date(), autoTask.dueDays);

                    await createTask.mutateAsync({
                        title: autoTask.title,
                        due_date: formatDateForDB(dueDate),
                        original_due_date: formatDateForDB(dueDate), // Store original due date
                        is_auto_generated: true, // Mark as auto-generated task
                        deal_id: deal.id,
                        account_id: deal.account_id,
                        status: 'pending',
                        priority: 'medium',
                        assigned_to: deal.owner_id || user?.id,
                        description: `Auto-created task for stage transition: ${currentStage.name} → ${targetStage.name}`,
                    });

                    toast({
                        title: `Deal moved to ${targetStage.name}`,
                        description: `Task created: "${autoTask.title}"`,
                    });
                } catch (taskError) {
                    console.error("Failed to create auto-task:", taskError);
                    toast({
                        title: `Deal moved to ${targetStage.name}`,
                        description: "Note: Failed to create follow-up task",
                        variant: "default",
                    });
                }
            } else if (isProposalToNegotiation) {
                toast({
                    title: "Deal moved to Negotiation",
                    description: "Review and finalize the contract details",
                });
            } else {
                toast({
                    title: `Deal moved to ${targetStage.name}`,
                });
            }

            // Show time entry dialog after deal moves
            setTimeEntryDealData({
                dealId: deal.id,
                dealName: deal.deal_name || "Deal",
                stageName: targetStage.name,
                taskTitle: autoTask?.title || `Deal moved to ${targetStage.name}`,
            });
            setTimeEntryDialogOpen(true);

            // If Closed Won and has an account, convert to customer
            if (isClosedWon && deal.account_id) {
                await convertToCustomer.mutateAsync({
                    accountId: deal.account_id,
                    contactId: deal.primary_contact_id,
                });

                // Send new customer notification email to Belinda
                try {
                    console.log("Sending new customer notification for deal:", deal.id);
                    const { error: emailError } = await supabase.functions.invoke('send-new-customer-notification', {
                        body: { dealId: deal.id }
                    });
                    if (emailError) {
                        console.error("Failed to send new customer notification:", emailError);
                    } else {
                        console.log("New customer notification sent successfully");
                    }
                } catch (emailErr) {
                    console.error("Error sending new customer notification:", emailErr);
                }
            }
        } catch (error) {
            console.error("Failed to move deal:", error);
        }
    };

    const validateAndMoveDeal = async (deal: PipelineItem, newStageId: string) => {
        // Don't update if dropped in the same column
        if (deal.stage_id === newStageId) return;

        // Find current and target stages
        const currentStage = activeStages.find(s => s.id === deal.stage_id);
        const targetStage = activeStages.find(s => s.id === newStageId);

        if (!currentStage || !targetStage) return;

        // Validate the movement
        const validation = canMoveToStage(currentStage.stage_order, targetStage);

        if (!validation.allowed) {
            toast({
                title: "Cannot move deal",
                description: validation.reason,
                variant: "destructive",
            });
            return;
        }

        // If target stage is Closed Lost, open special dialog
        if (targetStage.is_closed_lost) {
            setCloseLostDealData({
                deal,
                targetStageId: newStageId,
                targetStageName: targetStage.name,
            });
            setCloseLostDialogOpen(true);
            return;
        }

        // Proceed with the move directly - no validation checks required
        await executeDealMove(deal, newStageId, currentStage, targetStage);
    };

    // Execute Close Lost move after dialog confirmation
    const executeCloseLostMove = async (lostReason: string, lostReasonOther?: string) => {
        if (!closeLostDealData) return;
        
        const { deal, targetStageId, targetStageName } = closeLostDealData;
        const currentStage = activeStages.find(s => s.id === deal.stage_id);
        
        if (!currentStage) return;
        
        try {
            // Complete existing tasks (no note from close lost dialog)
            await completeTasksByDeal.mutateAsync({ dealId: deal.id });
            
            // Move the deal
            await moveDeal.mutateAsync({
                dealId: deal.id,
                stageId: targetStageId,
                accountId: deal.account_id,
                primaryContactId: deal.primary_contact_id,
                isClosedWon: false,
                clearContractDetails: false,
            });
            
            // Update deal with lost reason
            await supabase
                .from('deals')
                .update({
                    lost_reason: lostReason,
                    lost_reason_other: lostReasonOther || null,
                })
                .eq('id', deal.id);
            
            toast({
                title: `Deal marked as ${targetStageName}`,
                description: "The deal has been closed and reason recorded.",
            });
            
            setCloseLostDialogOpen(false);
            setCloseLostDealData(null);
        } catch (error) {
            console.error("Failed to close deal as lost:", error);
            toast({
                title: "Failed to close deal",
                description: "An error occurred while closing the deal",
                variant: "destructive",
            });
        }
    };

    return {
        validateAndMoveDeal,
        executeCloseLostMove,
        selectedDeal,
        setSelectedDeal,
        dialogOpen,
        setDialogOpen,
        pendingTargetStageId,
        setPendingTargetStageId,
        dialogResetKey,
        activeStages,
        // Close Lost dialog state
        closeLostDialogOpen,
        setCloseLostDialogOpen,
        closeLostDealData,
        setCloseLostDealData,
        // Time entry dialog state
        timeEntryDialogOpen,
        setTimeEntryDialogOpen,
        timeEntryDealData,
    };
}
