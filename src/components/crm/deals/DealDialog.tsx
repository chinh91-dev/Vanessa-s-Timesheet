import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, FileText, Upload, X, ExternalLink, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateDeal, useUpdateDeal, useDeleteDeal } from "@/hooks/crm/useDeals";
import { useAccounts } from "@/hooks/crm/useAccounts";
import { useContacts } from "@/hooks/crm/useContacts";
import { usePipelineStages } from "@/hooks/crm/usePipelineStages";
import { useCreateTask, useCompleteTasksByDealId } from "@/hooks/crm/useTasks";
import { useServices } from "@/hooks/crm/useServices";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { DEAL_STATUSES, BILLING_CADENCES, BILLING_TYPES } from "@/lib/crm/constants";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { canAssignToOthers } from "@/lib/crm/permissions";
import { DealStageNotesSection } from "./DealStageNotesSection";
import { useCreateDealStageNote } from "@/hooks/crm/useDealStageNotes";
import type { Deal, PipelineStage } from "@/lib/crm/types";

const baseDealSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  account_id: z.string().optional().or(z.literal("")),
  pipeline_stage_id: z.string().uuid("Please select a stage"),
  primary_contact_id: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().min(0).optional(),
  close_date: z.date().optional(),
  status: z.enum(["draft", "pending_approval", "approved", "active", "completed", "cancelled"]).optional(),
  billing_cadence: z.enum(["monthly", "quarterly", "annually", "one_time"]).optional(),
  contract_type: z.string().max(50).optional(),
  contract_value: z.coerce.number().min(0).optional(),
  owner_id: z.string().uuid().optional(),
  service_ids: z.array(z.string().uuid()).optional(),
  legal_review_completed: z.boolean().optional(),
});

const createDealSchema = (_stages: PipelineStage[] | undefined) => baseDealSchema;

type DealFormData = z.infer<typeof baseDealSchema>;

interface DealDialogProps {
  open: boolean;
  onClose: () => void;
  deal?: Deal;
  pendingTargetStageId?: string | null;
  /** Hide Primary Lead, Account, Pipeline Stage, and Expected Close Date fields when editing */
  hideFieldsOnEdit?: boolean;
  /** View-only mode - disables all form inputs (for sale_user in archive) */
  readOnly?: boolean;
  /** Show delete button (admin only) */
  canDelete?: boolean;
}

// File validation constants
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DealDialog({ open, onClose, deal, pendingTargetStageId, hideFieldsOnEdit, readOnly, canDelete }: DealDialogProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const createTask = useCreateTask();
  const completeTasksByDeal = useCompleteTasksByDealId();
  const { data: accounts } = useAccounts({ enabled: open });
  const { data: contacts } = useContacts();
  const { data: stages } = usePipelineStages();
  const { data: services } = useServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ownerComboboxOpen, setOwnerComboboxOpen] = useState(false);
  const [stageNote, setStageNote] = useState("");
  const createStageNote = useCreateDealStageNote();

  // Fetch CRM users for the "Assign To" dropdown (only for admin/sale_manager)
  const { data: crmUsers } = useQuery({
    queryKey: ['crm-users-assignable'],
    queryFn: async () => {
      // Step 1: Get user IDs with assignable roles
      const assignableRoles = ['admin', 'sale_manager', 'sale_user'];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', assignableRoles);

      if (rolesError) throw rolesError;
      if (!rolesData || rolesData.length === 0) return [];

      // Step 2: Get unique user IDs
      const userIds = [...new Set(rolesData.map(r => r.user_id))];

      // Step 3: Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;
      return profilesData || [];
    },
    enabled: open && canAssignToOthers(userRole),
  });
  
  // Proposal file upload state
  const [selectedProposalFile, setSelectedProposalFile] = useState<File | null>(null);
  const [isUploadingProposal, setIsUploadingProposal] = useState(false);
  const [proposalFileError, setProposalFileError] = useState<string | null>(null);
  const proposalFileInputRef = useRef<HTMLInputElement>(null);

  const dealSchema = createDealSchema(stages);
  
  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name: deal?.name || (deal as any)?.deal_name || "",
      account_id: deal?.account_id || "",
      pipeline_stage_id: deal?.pipeline_stage_id || (deal as any)?.stage_id || "",
      primary_contact_id: deal?.primary_contact_id || "",
      amount: deal?.amount || undefined,
      close_date: deal?.close_date ? new Date(deal.close_date) : undefined,
      status: deal?.status || "draft",
      billing_cadence: deal?.billing_cadence as any || undefined,
      contract_type: deal?.contract_type || "",
      contract_value: deal?.contract_value || undefined,
      owner_id: deal?.owner_id || user?.id || "",
      service_ids: [],
      legal_review_completed: deal?.legal_review_completed || false,
    },
  });

  // State for legal review completion info
  const [legalReviewInfo, setLegalReviewInfo] = useState<{ completedBy: string; completedAt: string } | null>(null);

  // Fetch legal review completion info when editing
  useEffect(() => {
    const fetchLegalReviewInfo = async () => {
      if (!deal?.id || !deal?.legal_review_completed) {
        setLegalReviewInfo(null);
        return;
      }
      
      try {
        const { data: dealData, error } = await supabase
          .from('deals')
          .select(`
            legal_review_completed_at,
            legal_review_completed_by,
            completed_by_profile:profiles!deals_approved_by_fkey(full_name)
          `)
          .eq('id', deal.id)
          .single();
        
        if (!error && dealData?.legal_review_completed_at) {
          // Fetch the profile of who completed it
          if (dealData.legal_review_completed_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', dealData.legal_review_completed_by)
              .single();
            
            setLegalReviewInfo({
              completedBy: profile?.full_name || 'Unknown',
              completedAt: dealData.legal_review_completed_at,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching legal review info:", err);
      }
    };
    
    fetchLegalReviewInfo();
  }, [deal?.id, deal?.legal_review_completed]);

  // Fetch existing deal items when editing
  const { data: existingDealItems } = useQuery({
    queryKey: ['deal-items', deal?.id],
    queryFn: async () => {
      if (!deal?.id) return [];
      const { data, error } = await supabase
        .from('deal_items')
        .select('service_id')
        .eq('deal_id', deal.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!deal?.id,
  });

  useEffect(() => {
    if (open && deal) {
      form.reset({
        name: deal.name || (deal as any).deal_name || "",
        account_id: deal.account_id || "",
        pipeline_stage_id: pendingTargetStageId || deal.pipeline_stage_id || (deal as any).stage_id || "",
        primary_contact_id: deal.primary_contact_id || "",
        amount: deal.amount || undefined,
        close_date: deal.close_date ? new Date(deal.close_date) : undefined,
        status: deal.status || "draft",
        billing_cadence: deal.billing_cadence as any || undefined,
        contract_type: deal.contract_type || "",
        contract_value: deal.contract_value || undefined,
        owner_id: deal.owner_id || user?.id || "",
        service_ids: [],
        legal_review_completed: deal.legal_review_completed || false,
      });
      // Reset file state when dialog opens
      setSelectedProposalFile(null);
      setProposalFileError(null);
      // Reset stage note when switching deals
      setStageNote("");
    } else if (open && !deal) {
      form.reset({
        name: "",
        account_id: "",
        pipeline_stage_id: stages?.find(s => s.is_active)?.id || "",
        primary_contact_id: "",
        amount: undefined,
        close_date: undefined,
        status: "draft",
        billing_cadence: undefined,
        contract_type: "",
        contract_value: undefined,
        owner_id: user?.id || "",
        service_ids: [],
        legal_review_completed: false,
      });
      setSelectedProposalFile(null);
      setProposalFileError(null);
      // Reset stage note for new deals
      setStageNote("");
    }
  }, [open, deal, form, stages, pendingTargetStageId]);

  // Populate service_ids from existing deal items when editing
  useEffect(() => {
    if (existingDealItems && existingDealItems.length > 0) {
      const serviceIds = existingDealItems
        .map(item => item.service_id)
        .filter((id): id is string => id !== null);
      form.setValue('service_ids', serviceIds);
    }
  }, [existingDealItems, form]);

  // Handle proposal file selection
  const handleProposalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProposalFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setProposalFileError("Only PDF or Word documents are allowed");
      setSelectedProposalFile(null);
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setProposalFileError("File size exceeds 10MB limit");
      setSelectedProposalFile(null);
      return;
    }
    
    setSelectedProposalFile(file);
  };

  // Upload proposal file to Supabase storage
  const uploadProposalFile = async (file: File, dealId: string) => {
    setIsUploadingProposal(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${dealId}-${Date.now()}.${fileExt}`;
      const filePath = `proposals/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('deal-proposals')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      
      if (error) throw error;
      
      // Get signed URL (bucket is now private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('deal-proposals')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (urlError) throw urlError;
      
      // Update deal with file info
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          proposal_file_id: data?.path,
          proposal_file_name: file.name,
          proposal_file_type: file.type,
          proposal_file_size: file.size,
          proposal_file_url: urlData.signedUrl,
          proposal_uploaded_at: new Date().toISOString()
        })
        .eq('id', dealId);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Proposal uploaded",
        description: "The proposal document has been uploaded successfully.",
      });
      return true;
    } catch (error) {
      console.error('Error uploading proposal:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the proposal document. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploadingProposal(false);
    }
  };

  // Clear selected proposal file
  const clearProposalFile = () => {
    setSelectedProposalFile(null);
    setProposalFileError(null);
    if (proposalFileInputRef.current) {
      proposalFileInputRef.current.value = "";
    }
  };

  // Delete existing proposal file from storage and database
  const deleteProposalFile = async () => {
    if (!deal?.proposal_file_id || !deal?.id) return;
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('deal-proposals')
        .remove([deal.proposal_file_id]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
      }
      
      // Clear file info from deal record
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          proposal_file_id: null,
          proposal_file_name: null,
          proposal_file_type: null,
          proposal_file_size: null,
          proposal_file_url: null,
          proposal_uploaded_at: null
        })
        .eq('id', deal.id);
      
      if (updateError) throw updateError;
      
      // Invalidate pipeline query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      
      toast({
        title: "Proposal deleted",
        description: "The proposal document has been removed.",
      });
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the proposal document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: DealFormData) => {
    const currentStage = stages?.find(s => s.id === data.pipeline_stage_id);
    const originalStageId = deal?.pipeline_stage_id || (deal as any)?.stage_id;
    const originalStage = stages?.find(s => s.id === originalStageId);
    
    // Determine if this is a forward stage movement
    const isForwardStageMove = deal?.id && 
      originalStage && 
      currentStage && 
      currentStage.stage_order > originalStage.stage_order;
    
    
    setIsSubmitting(true);
    try {
      // Destructure service_ids and legal_review_completed out since they need special handling
      const { service_ids, legal_review_completed, ...dealData } = data;
      
      // Check if legal_review_completed changed from false to true
      const legalReviewJustCompleted = legal_review_completed && !deal?.legal_review_completed;
      
      const submitData: any = {
        ...dealData,
        primary_contact_id: dealData.primary_contact_id || null,
        close_date: dealData.close_date ? format(dealData.close_date, "yyyy-MM-dd") : null,
        legal_review_completed: legal_review_completed || false,
      };

      // If legal review just completed, set timestamp and user
      if (legalReviewJustCompleted) {
        submitData.legal_review_completed_at = new Date().toISOString();
        submitData.legal_review_completed_by = user?.id;
      }

      let savedDealId: string;
      let savedAccountId: string | null = data.account_id;

      // Check if pipeline stage changed (for existing deals) - originalStageId/originalStage already defined above
      const stageChanged = deal && data.pipeline_stage_id !== originalStageId;

      // If stage changed, complete existing tasks first (with stage note as completion notes)
      if (stageChanged && deal?.id) {
        await completeTasksByDeal.mutateAsync({ 
          dealId: deal.id, 
          completionNotes: stageNote.trim() || undefined 
        });
        
        // Contract details are preserved during stage transitions - no clearing needed
      }

      if (deal) {
        await updateDeal.mutateAsync({ id: deal.id, updates: submitData as any });
        savedDealId = deal.id;
      } else {
        const newDeal = await createDeal.mutateAsync({
          ...submitData,
          owner_id: submitData.owner_id || user?.id || "",
          created_by: user?.id || "",
        } as any);
        savedDealId = newDeal.id;
      }

      // Upload proposal file if selected
      if (selectedProposalFile) {
        await uploadProposalFile(selectedProposalFile, savedDealId);
      }

      // Sync deal items (services)
      if (data.service_ids && data.service_ids.length > 0) {
        // Delete existing deal_items for this deal
        await supabase.from('deal_items').delete().eq('deal_id', savedDealId);
        
        // Insert new deal_items for selected services
        const newItems = data.service_ids.map((serviceId, index) => {
          const service = services?.find(s => s.id === serviceId);
          return {
            deal_id: savedDealId,
            service_id: serviceId,
            description: service?.name || '',
            quantity: 1,
            unit_price: 0,
            discount_percent: 0,
            tax_percent: 0,
            sort_order: index,
          };
        });
        await supabase.from('deal_items').insert(newItems);
      } else if (deal) {
        // Clear deal items if none selected (for existing deals)
        await supabase.from('deal_items').delete().eq('deal_id', savedDealId);
      }

      // Invalidate pipeline query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['deal-items', savedDealId] });

      // Save stage note for existing deals OR new Closed Won deals
      // When stage has changed, save the note for the ORIGINAL stage (not target)
      // Exception: For Closed Won, save the "why we win" note to the Closed Won stage
      if (stageNote.trim()) {
        const targetStage = stages?.find(s => s.id === data.pipeline_stage_id);
        const shouldSaveNote = deal?.id || targetStage?.is_closed_won;

        if (shouldSaveNote && deal?.id) {
          // For existing deals: determine which stage to save the note for
          const originalStageId = deal?.pipeline_stage_id || (deal as any)?.stage_id;
          const stageHasChanged = data.pipeline_stage_id !== originalStageId;

          // If moving to Closed Won, save note for the Closed Won stage (win reason)
          // Otherwise if stage changed, save note for the ORIGINAL stage
          // If no stage change, save for current stage
          let stageIdForNote: string;
          if (targetStage?.is_closed_won) {
            stageIdForNote = data.pipeline_stage_id;
          } else if (stageHasChanged) {
            stageIdForNote = originalStageId;
          } else {
            stageIdForNote = data.pipeline_stage_id;
          }
          const stageForNote = stages?.find(s => s.id === stageIdForNote);

          await createStageNote.mutateAsync({
            deal_id: savedDealId,
            stage_id: stageIdForNote,
            stage_name: stageForNote?.name || "Unknown Stage",
            note_content: stageNote.trim(),
          });
          setStageNote(""); // Clear after saving
        } else if (shouldSaveNote && !deal && targetStage?.is_closed_won) {
          // For new deals at Closed Won: save note for the Closed Won stage
          await createStageNote.mutateAsync({
            deal_id: savedDealId,
            stage_id: data.pipeline_stage_id,
            stage_name: targetStage?.name || "Closed Won",
            note_content: stageNote.trim(),
          });
          setStageNote(""); // Clear after saving
        }
      }

      onClose();
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStages = stages?.filter(s => s.is_active) || [];
  const availableContacts = contacts || [];
  
  // Show contract details only from Negotiation stage (stage_order >= 4) or later
  const selectedStageId = form.watch("pipeline_stage_id");
  const selectedStage = stages?.find(s => s.id === selectedStageId);
  const showContractDetails = selectedStage ? selectedStage.stage_order >= 4 : false;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto !block">
        <DialogHeader>
          <DialogTitle>{readOnly ? "View Deal" : deal ? "Edit Deal" : "Create Deal"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enterprise License Agreement" disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hide Pipeline Stage and Contact when editing from Pipeline page */}
            {(!deal || !hideFieldsOnEdit) && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primary_contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {availableContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.company_name} {contact.contact_name && `(${contact.contact_name})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pipeline_stage_id"
                  render={({ field }) => {
                    const currentStageName = stages?.find(s => s.id === field.value)?.name;
                    return (
                      <FormItem>
                        <FormLabel>Pipeline Stage</FormLabel>
                        {deal ? (
                          // Read-only display for existing deals
                          <FormControl>
                            <Input 
                              value={currentStageName || "Unknown Stage"} 
                              disabled 
                              className="bg-muted cursor-not-allowed"
                            />
                          </FormControl>
                        ) : (
                          // Editable dropdown for new deals only
                          <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeStages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  {stage.name} ({stage.default_probability}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            )}


            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="$0"
                      disabled={readOnly}
                      value={field.value ? new Intl.NumberFormat('en-AU', { 
                        style: 'currency', 
                        currency: 'AUD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(field.value) : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        field.onChange(value ? parseFloat(value) : undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Services Selection - required from Discovery stage */}
            <FormField
              control={form.control}
              name="service_ids"
              render={({ field }) => {
                // Group services by category
                const activeServices = services?.filter(s => s.is_active) || [];
                const groupedServices = activeServices.reduce((acc, service) => {
                  const category = service.category || 'Uncategorized';
                  if (!acc[category]) {
                    acc[category] = [];
                  }
                  acc[category].push(service);
                  return acc;
                }, {} as Record<string, typeof activeServices>);

                return (
                  <FormItem>
                    <FormLabel>Services</FormLabel>
                    <FormControl>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-4">
                        {Object.keys(groupedServices).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No active services available</p>
                        ) : (
                          Object.entries(groupedServices)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([category, categoryServices]) => (
                              <div key={category}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs font-medium">
                                    {category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    ({categoryServices.length})
                                  </span>
                                </div>
                                <div className="ml-2 space-y-2 border-l-2 border-muted pl-3">
                                  {categoryServices.map((service) => (
                                    <div key={service.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`service-${service.id}`}
                                        checked={field.value?.includes(service.id)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, service.id]);
                                          } else {
                                            field.onChange(current.filter(id => id !== service.id));
                                          }
                                        }}
                                        disabled={readOnly}
                                      />
                                      <label 
                                        htmlFor={`service-${service.id}`}
                                        className="text-sm cursor-pointer flex-1"
                                      >
                                        {service.name}
                                        {service.sku && (
                                          <span className="text-muted-foreground ml-2">({service.sku})</span>
                                        )}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {(!deal || !hideFieldsOnEdit) && (
              <FormField
                control={form.control}
                name="close_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expected Close Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            disabled={readOnly}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assign To field - only visible to admin/sale_manager and on Deals page (not Pipeline) */}
            {canAssignToOthers(userRole) && !hideFieldsOnEdit && (
              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => {
                  const selectedUser = crmUsers?.find(u => u.id === field.value);
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Assign To</FormLabel>
                      <Popover open={ownerComboboxOpen} onOpenChange={setOwnerComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={readOnly}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {selectedUser?.full_name || "Select user..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search users..." />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                {crmUsers?.map((crmUser) => (
                                  <CommandItem
                                    key={crmUser.id}
                                    value={crmUser.full_name || crmUser.email || crmUser.id}
                                    onSelect={() => {
                                      field.onChange(crmUser.id);
                                      setOwnerComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === crmUser.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {crmUser.full_name || crmUser.email}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            {/* Next Step — view only when editing from pipeline */}
            {deal && hideFieldsOnEdit && (deal.next_step || deal.next_step_due_date) && (
              <div className="border rounded-md p-3 bg-muted/30 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Step</p>
                {deal.next_step && (
                  <p className="text-sm">{deal.next_step}</p>
                )}
                {deal.next_step_due_date && (
                  <p className="text-xs text-muted-foreground">
                    Due {format(new Date(deal.next_step_due_date), "d MMM yyyy")}
                  </p>
                )}
              </div>
            )}

            {/* Stage Notes Section - always show, for both new and existing deals */}
            <div className="border-t pt-4">
              <DealStageNotesSection
                dealId={deal?.id || "new-deal"}
                currentStageId={selectedStage?.id || form.watch("pipeline_stage_id") || ""}
                currentStageName={selectedStage?.name || "Initial Stage"}
                isClosedWon={selectedStage?.is_closed_won}
                isClosedLost={selectedStage?.is_closed_lost}
                canAddNote={!readOnly}
                noteValue={stageNote}
                onNoteChange={setStageNote}
                isNewDeal={!deal?.id}
                isRequired={false}
              />
            </div>

            {showContractDetails && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">
                  Contract Details
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contract_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Value</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="$0"
                            disabled={readOnly}
                            value={field.value ? new Intl.NumberFormat('en-AU', { 
                              style: 'currency', 
                              currency: 'AUD',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(field.value) : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              field.onChange(value ? parseFloat(value) : undefined);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billing_cadence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Cadence</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cadence" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(BILLING_CADENCES).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contract_type"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Contract Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Service Agreement, License, etc." disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Proposal Document Upload */}
                <div className="space-y-2 mt-4">
                  <FormLabel className={selectedStage?.is_closed_won ? "text-destructive" : ""}>Proposal Document {selectedStage?.is_closed_won && <span className="text-xs">(Required)</span>}</FormLabel>
                  <div className="border rounded-md p-4">
                    {/* Show existing proposal if available */}
                    {deal?.proposal_file_url && !selectedProposalFile && (
                      <div className="flex items-center justify-between p-2 border rounded bg-muted/30 mb-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                          <span className="text-sm font-medium truncate">
                            {deal.proposal_file_name}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {deal.proposal_file_type?.includes('pdf') ? 'PDF' : 'DOC'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={deal.proposal_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={deleteProposalFile}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!readOnly && !selectedProposalFile && (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                        <div className="text-sm text-muted-foreground mb-2">
                          {deal?.proposal_file_url 
                            ? "Upload a new proposal to replace the existing one"
                            : "Upload the proposal sent to the client (PDF or Word, max 10MB)"
                          }
                        </div>
                        <label htmlFor="proposal-file" className="cursor-pointer">
                          <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2 text-sm">
                            <Upload className="h-4 w-4" />
                            <span>Select File</span>
                          </div>
                          <input
                            id="proposal-file"
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={handleProposalFileChange}
                            ref={proposalFileInputRef}
                          />
                        </label>
                      </div>
                    )}
                    
                    {readOnly && !deal?.proposal_file_url && (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                        <div className="text-sm text-muted-foreground">
                          No proposal document uploaded
                        </div>
                      </div>
                    )}
                    
                    {!readOnly && selectedProposalFile && (
                      <div className="flex items-center justify-between p-2 border rounded bg-muted/30">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                          <span className="text-sm font-medium truncate">
                            {selectedProposalFile.name}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {selectedProposalFile.type.includes('pdf') ? 'PDF' : 'DOC'}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearProposalFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {proposalFileError && (
                      <p className="text-sm text-destructive mt-2">{proposalFileError}</p>
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className={selectedStage?.is_closed_won ? "text-destructive" : ""}>Status {selectedStage?.is_closed_won && <span className="text-xs">(Required)</span>}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(DEAL_STATUSES).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>
                          {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legal Review Checkbox */}
                <FormField
                  control={form.control}
                  name="legal_review_completed"
                  render={({ field }) => (
                    <FormItem className="mt-4 border rounded-md p-4 bg-muted/30">
                      <div className="flex items-start space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={readOnly || deal?.legal_review_completed}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <div className="flex-1 space-y-1">
                          <FormLabel className={`text-sm font-medium cursor-pointer ${selectedStage && selectedStage.stage_order >= 4 ? "text-destructive" : ""}`}>
                            Legal review has been completed {selectedStage && selectedStage.stage_order >= 4 && <span className="text-xs">(Required)</span>}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Required before moving to Negotiation stage. This will notify the legal team.
                          </p>
                          {legalReviewInfo && (
                            <p className="text-xs text-muted-foreground italic mt-2">
                              Completed by {legalReviewInfo.completedBy} on {format(new Date(legalReviewInfo.completedAt), "PPP 'at' p")}
                            </p>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-between gap-2 pt-4">
              <div>
                {canDelete && deal && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Deal
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete this deal? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await deleteDeal.mutateAsync(deal.id);
                            onClose();
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {readOnly ? "Close" : "Cancel"}
                </Button>
                {!readOnly && (
                  <Button type="submit" disabled={isSubmitting || isUploadingProposal}>
                    {isSubmitting || isUploadingProposal ? "Saving..." : deal ? "Update" : "Create"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
