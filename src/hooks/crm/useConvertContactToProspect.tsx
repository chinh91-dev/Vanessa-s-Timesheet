import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logCRMAuditEvent } from "@/lib/crm/audit-utils";
import type { Contact, ProspectPriority } from "@/lib/crm/types";

export interface ConvertContactToProspectInput {
  contact: Contact;
  prospectName: string;
  priority: ProspectPriority;
  source?: string | null;
  segment?: string | null;
  summary?: string | null;
  accountId?: string | null;
  userId: string;
}

export const useConvertContactToProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConvertContactToProspectInput) => {
      const {
        contact,
        prospectName,
        priority,
        source,
        segment,
        summary,
        accountId,
        userId,
      } = input;

      const { data: newProspect, error: prospectError } = await supabase
        .from("prospects")
        .insert({
          name: prospectName,
          account_id: accountId || null,
          owner_id: contact.owner_id || userId,
          stage: "new",
          priority,
          source: (source as any) || null,
          segment: (segment as any) || null,
          summary: summary || null,
          created_by: userId,
        })
        .select("id, name, stage")
        .single();

      if (prospectError) throw prospectError;

      const { error: linkError } = await supabase
        .from("prospect_contacts")
        .insert({
          prospect_id: newProspect.id,
          contact_id: contact.id,
          is_primary: true,
        });

      if (linkError) throw linkError;

      return { prospect: newProspect, contact };
    },
    onSuccess: ({ prospect, contact }) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "prospects"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "contacts"] });

      logCRMAuditEvent({
        action: "contact_converted_to_prospect",
        entityName: `Contact: ${contact.contact_name || contact.company_name || contact.id}`,
        description: `Converted contact to prospect "${prospect.name}"`,
        details: {
          contact_id: contact.id,
          prospect_id: prospect.id,
        },
      });

      toast({
        title: "Converted to Prospect",
        description: `Prospect "${prospect.name}" created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
