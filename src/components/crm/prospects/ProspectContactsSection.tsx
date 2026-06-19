import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserPlus, X, Star, ChevronsUpDown } from "lucide-react";
import { useLinkContactToProspect, useUnlinkContactFromProspect, useSetPrimaryContact } from "@/hooks/crm/useProspectContacts";
import { useContacts } from "@/hooks/crm/useContacts";
import type { Prospect } from "@/lib/crm/types";

interface ProspectContactsSectionProps {
  prospect: Prospect;
  readOnly?: boolean;
}

export function ProspectContactsSection({ prospect, readOnly }: ProspectContactsSectionProps) {
  const [comboOpen, setComboOpen] = useState(false);
  const { data: allContacts = [] } = useContacts();
  const linkContact = useLinkContactToProspect();
  const unlinkContact = useUnlinkContactFromProspect();
  const setPrimary = useSetPrimaryContact();

  const linkedContactIds = new Set((prospect.prospect_contacts || []).map((pc) => pc.contact_id));

  const availableContacts = allContacts.filter((c) => !linkedContactIds.has(c.id));

  const handleLink = (contactId: string) => {
    const isFirst = (prospect.prospect_contacts || []).length === 0;
    linkContact.mutate({ prospectId: prospect.id, contactId, isPrimary: isFirst });
    setComboOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Contacts</h4>
        {!readOnly && (
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <UserPlus className="h-3 w-3" />
                Add Contact
                <ChevronsUpDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search contacts..." />
                <CommandList>
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {availableContacts.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.contact_name || c.id}
                        onSelect={() => handleLink(c.id)}
                      >
                        <span className="font-medium">{c.contact_name}</span>
                        {c.company_name && (
                          <span className="ml-1 text-xs text-muted-foreground">· {c.company_name}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {(prospect.prospect_contacts || []).length === 0 ? (
        <p className="text-xs text-muted-foreground">No contacts linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {(prospect.prospect_contacts || []).map((pc) => (
            <li key={pc.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                {pc.is_primary && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium leading-none">{pc.contact?.contact_name}</p>
                  {pc.contact?.company_name && (
                    <p className="text-xs text-muted-foreground">{pc.contact.company_name}</p>
                  )}
                  {pc.role_label && (
                    <Badge variant="outline" className="mt-1 text-xs">{pc.role_label}</Badge>
                  )}
                </div>
              </div>

              {!readOnly && (
                <div className="flex gap-1">
                  {!pc.is_primary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Set as primary"
                      onClick={() => setPrimary.mutate({ prospectId: prospect.id, prospectContactId: pc.id })}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    title="Remove contact"
                    onClick={() => unlinkContact.mutate({ prospectContactId: pc.id, prospectId: prospect.id })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
