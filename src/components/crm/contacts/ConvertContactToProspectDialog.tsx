import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Target } from "lucide-react";
import { useConvertContactToProspect } from "@/hooks/crm/useConvertContactToProspect";
import { useAuth } from "@/context/AuthContext";
import { PROSPECT_PRIORITIES, CONTACT_SOURCES, ACCOUNT_SEGMENTS } from "@/lib/crm/constants";
import { AccountCombobox } from "./AccountCombobox";
import type { Contact, ProspectPriority } from "@/lib/crm/types";

const convertSchema = z.object({
  prospectName: z.string().min(1, "Prospect name is required").max(150),
  priority: z.enum(["low", "medium", "high"]),
  source: z.string().optional(),
  segment: z.string().optional(),
  account_id: z.string().nullable().optional(),
  summary: z.string().optional(),
});

type ConvertFormData = z.infer<typeof convertSchema>;

interface ConvertContactToProspectDialogProps {
  open: boolean;
  onClose: () => void;
  contact: Contact;
}

export function ConvertContactToProspectDialog({ open, onClose, contact }: ConvertContactToProspectDialogProps) {
  const { user } = useAuth();
  const convert = useConvertContactToProspect();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyLabel = contact.company_name || contact.contact_name || "Contact";
  const defaultProspectName = `${companyLabel} - Outreach`;

  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      prospectName: defaultProspectName,
      priority: "medium",
      source: (contact.source as string) || undefined,
      segment: undefined,
      account_id: contact.converted_to_account_id || null,
      summary: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        prospectName: defaultProspectName,
        priority: "medium",
        source: (contact.source as string) || undefined,
        segment: undefined,
        account_id: contact.converted_to_account_id || null,
        summary: "",
      });
    }
  }, [open, defaultProspectName, contact, form]);

  const onSubmit = async (data: ConvertFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await convert.mutateAsync({
        contact,
        prospectName: data.prospectName,
        priority: data.priority as ProspectPriority,
        source: data.source || null,
        segment: data.segment || null,
        summary: data.summary || null,
        accountId: data.account_id || null,
        userId: user.id,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <DialogTitle>Convert to Prospect</DialogTitle>
          </div>
          <DialogDescription>
            Promote <strong>{contact.contact_name || companyLabel}</strong> into a prospect pursuit. The contact will be linked as the primary contact.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prospectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prospect Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Aquinas College - MFA Outreach" />
                  </FormControl>
                  <FormDescription>
                    Pursuit label, not a person. Format: <em>School — Offer</em>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    Optional — link to an existing CRM account. Pre-filled from the contact's account if any.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem key={p} value={p}>{PROSPECT_PRIORITIES[p].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Why pursue this contact? What is the angle?" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Carrying over</p>
              <p><strong>Primary Contact:</strong> {contact.contact_name || companyLabel}</p>
              {contact.email && <p><strong>Email:</strong> {contact.email}</p>}
              {contact.company_name && <p><strong>Company:</strong> {contact.company_name}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Converting..." : "Convert to Prospect"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
