import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AccountCombobox } from "@/components/crm/contacts/AccountCombobox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Target } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateProspect, useUpdateProspect } from "@/hooks/crm/useProspects";
import { useAuth } from "@/context/AuthContext";
import { PROSPECT_STAGES, PROSPECT_PRIORITIES, CONTACT_SOURCES, ACCOUNT_SEGMENTS } from "@/lib/crm/constants";
import type { Prospect, ProspectStage, ProspectPriority } from "@/lib/crm/types";

const prospectSchema = z.object({
  name: z.string().min(1, "Prospect name is required").max(150),
  account_id: z.string().nullable().optional(),
  stage: z.enum(["new", "researched", "outreach_started", "engaged", "qualified", "nurture", "disqualified"]),
  priority: z.enum(["low", "medium", "high"]),
  source: z.string().optional(),
  segment: z.string().optional(),
  summary: z.string().optional(),
  qualification_notes: z.string().optional(),
  next_action: z.string().optional(),
  next_action_due_date: z.date().optional(),
  nurture_reason: z.string().optional(),
  disqualified_reason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.stage === "nurture" && !data.nurture_reason) {
    ctx.addIssue({ code: "custom", path: ["nurture_reason"], message: "Nurture reason is required" });
  }
  if (data.stage === "disqualified" && !data.disqualified_reason) {
    ctx.addIssue({ code: "custom", path: ["disqualified_reason"], message: "Disqualified reason is required" });
  }
});

type ProspectFormData = z.infer<typeof prospectSchema>;

interface ProspectDialogProps {
  open: boolean;
  onClose: () => void;
  prospect?: Prospect;
}

export function ProspectDialog({ open, onClose, prospect }: ProspectDialogProps) {
  const { user } = useAuth();
  const createProspect = useCreateProspect();
  const updateProspect = useUpdateProspect();
  const isEditing = !!prospect;

  const form = useForm<ProspectFormData>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      name: "",
      account_id: null,
      stage: "new",
      priority: "medium",
      source: undefined,
      segment: undefined,
      summary: "",
      qualification_notes: "",
      next_action: "",
      next_action_due_date: undefined,
      nurture_reason: "",
      disqualified_reason: "",
    },
  });

  const watchedStage = form.watch("stage");

  useEffect(() => {
    if (open) {
      form.reset(
        prospect
          ? {
              name: prospect.name,
              account_id: prospect.account_id ?? null,
              stage: prospect.stage,
              priority: prospect.priority,
              source: prospect.source ?? undefined,
              segment: prospect.segment ?? undefined,
              summary: prospect.summary ?? "",
              qualification_notes: prospect.qualification_notes ?? "",
              next_action: prospect.next_action ?? "",
              next_action_due_date: prospect.next_action_due_date
                ? new Date(prospect.next_action_due_date)
                : undefined,
              nurture_reason: prospect.nurture_reason ?? "",
              disqualified_reason: prospect.disqualified_reason ?? "",
            }
          : {
              name: "",
              account_id: null,
              stage: "new",
              priority: "medium",
              source: undefined,
              segment: undefined,
              summary: "",
              qualification_notes: "",
              next_action: "",
              next_action_due_date: undefined,
              nurture_reason: "",
              disqualified_reason: "",
            }
      );
    }
  }, [open, prospect, form]);

  const onSubmit = async (data: ProspectFormData) => {
    if (!user) return;

    const payload = {
      name: data.name,
      account_id: data.account_id || null,
      owner_id: prospect?.owner_id || user.id,
      stage: data.stage as ProspectStage,
      priority: data.priority as ProspectPriority,
      source: (data.source as any) || null,
      segment: (data.segment as any) || null,
      summary: data.summary || null,
      qualification_notes: data.qualification_notes || null,
      next_action: data.next_action || null,
      next_action_due_date: data.next_action_due_date
        ? format(data.next_action_due_date, "yyyy-MM-dd")
        : null,
      nurture_reason: data.nurture_reason || null,
      disqualified_reason: data.disqualified_reason || null,
      created_by: prospect?.created_by || user.id,
    };

    if (isEditing && prospect) {
      await updateProspect.mutateAsync({ id: prospect.id, updates: payload });
    } else {
      await createProspect.mutateAsync(payload);
    }

    onClose();
  };

  const isPending = createProspect.isPending || updateProspect.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <DialogTitle>{isEditing ? "Edit Prospect" : "New Prospect"}</DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update the prospect details below."
              : "Add a new prospect pursuit to track before it becomes a deal."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prospect Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Aquinas College VIC - MFA Outreach" />
                  </FormControl>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span className="font-semibold">Tip:</span> This is the <span className="font-semibold">pursuit name</span>, not a person — use the format <span className="font-medium italic">School — Offer</span>.<br />
                    e.g. <span className="font-medium">Overnewton - AI Automation Outreach</span> or <span className="font-medium">Nazareth College - Cyber Review</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account (optional) */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      value={field.value ?? null}
                      onChange={(accountId) => field.onChange(accountId)}
                      placeholder="Link to existing account (optional)"
                    />
                  </FormControl>
                  <FormDescription>
                    Optional — link this prospect to an existing CRM account. Leave blank if pursuing a target without an account record yet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Stage */}
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PROSPECT_STAGES) as ProspectStage[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {PROSPECT_STAGES[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PROSPECT_PRIORITIES) as ProspectPriority[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            {PROSPECT_PRIORITIES[p].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Source */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CONTACT_SOURCES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Segment */}
              <FormField
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ACCOUNT_SEGMENTS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Summary */}
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Why are we pursuing this account? What is the angle?" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Qualification notes — show for qualified+ */}
            {["qualified", "engaged"].includes(watchedStage) && (
              <FormField
                control={form.control}
                name="qualification_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualification Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Why should this become a Deal? Stakeholder fit? Interest confirmed?" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Next action */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="next_action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Action</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Follow up email Monday" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="next_action_due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nurture reason — shown when stage = nurture */}
            {watchedStage === "nurture" && (
              <FormField
                control={form.control}
                name="nurture_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nurture Reason *</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Why is this prospect being nurtured? When should we follow up?" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Disqualified reason — shown when stage = disqualified */}
            {watchedStage === "disqualified" && (
              <FormField
                control={form.control}
                name="disqualified_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disqualified Reason *</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Why is this prospect being disqualified?" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Prospect")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
