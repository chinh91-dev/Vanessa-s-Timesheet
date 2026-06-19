import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Target } from "lucide-react";
import { useCreateContact, useUpdateContact, useDeleteContact } from "@/hooks/crm/useContacts";
import { useCreateContactNote } from "@/hooks/crm/useContactNotes";
import { useAuth } from "@/context/AuthContext";
import type { Contact, CreateContactDTO, ContactSource } from "@/lib/crm/types";
import { CONTACT_SOURCES } from "@/lib/crm/constants";
import { AccountCombobox } from "./AccountCombobox";
import { ContactCategorySelect } from "./ContactCategorySelect";
import { ContactNotesSection } from "./ContactNotesSection";
import { useContactCategoryAssignments, useUpdateContactCategories } from "@/hooks/crm/useContactCategories";

const contactSchema = z.object({
  contact_name: z.string().min(1, "Contact name is required").max(100),
  existing_account_id: z.string().nullable().optional(),
  company_name: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  work_phone: z.string().max(20).optional(),
  mobile_phone: z.string().max(20).optional(),
  title: z.string().max(100).optional(),
  source: z.enum(["website", "referral", "linkedin", "email_campaign", "event", "cold_outreach", "partner", "existing_client"]).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
  onConvertToProspect?: (contact: Contact) => void;
  /** View-only mode - disables all form inputs (for sale_user in archive) */
  readOnly?: boolean;
  /** Show delete button (admin only) */
  canDelete?: boolean;
}

export function ContactDialog({ open, onClose, contact, onConvertToProspect, readOnly, canDelete }: ContactDialogProps) {
  const { user } = useAuth();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createNote = useCreateContactNote();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [initialNoteValue, setInitialNoteValue] = useState("");
  
  // Fetch category assignments for existing contact
  const { data: categoryAssignments } = useContactCategoryAssignments(contact?.id);
  const updateCategories = useUpdateContactCategories();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contact_name: contact?.contact_name || "",
      existing_account_id: contact?.converted_to_account_id || null,
      company_name: contact?.company_name || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      work_phone: contact?.work_phone || "",
      mobile_phone: contact?.mobile_phone || "",
      title: contact?.title || "",
      source: contact?.source as ContactSource | undefined,
    },
  });

  // Watch existing_account_id to control company_name field
  const existingAccountId = form.watch("existing_account_id");

  // Reset form when contact changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        contact_name: contact?.contact_name || "",
        existing_account_id: contact?.converted_to_account_id || null,
        company_name: contact?.company_name || "",
        email: contact?.email || "",
        phone: contact?.phone || "",
        work_phone: contact?.work_phone || "",
        mobile_phone: contact?.mobile_phone || "",
        title: contact?.title || "",
        source: contact?.source as ContactSource | undefined,
      });
      setInitialNoteValue("");
    }
  }, [open, contact, form]);

  // Initialize selected categories when dialog opens or assignments load
  useEffect(() => {
    if (open && contact && categoryAssignments) {
      setSelectedCategoryIds(categoryAssignments.map(a => a.category_id));
    } else if (open && !contact) {
      setSelectedCategoryIds([]);
    }
  }, [open, contact, categoryAssignments]);

  const handleConvertToProspect = () => {
    if (contact && onConvertToProspect) {
      onClose();
      onConvertToProspect(contact);
    }
  };

  const handleAccountChange = (accountId: string | null, accountName: string | null) => {
    form.setValue("existing_account_id", accountId);
    if (accountId && accountName) {
      // Auto-fill company name when account is selected
      form.setValue("company_name", accountName);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    if (readOnly) return;

    setIsSubmitting(true);
    try {
      if (contact) {
        // Map existing_account_id to the actual database column name
        const { existing_account_id, ...updateData } = data;

        const updates = {
          ...updateData,
          converted_to_account_id: existing_account_id || null,
        };

        // Single round-trip: PATCH contact fields + sync categories.
        await updateContact.mutateAsync({
          id: contact.id,
          updates,
          categoryIds: selectedCategoryIds,
        });
      } else {
        const result = await createContact.mutateAsync({
          ...data,
          // Pass the existing_account_id so the hook can use it
          existing_account_id: data.existing_account_id || undefined,
        } as CreateContactDTO & { existing_account_id?: string });

        // Assign categories to new contact
        if (result?.contact && selectedCategoryIds.length > 0) {
          await updateCategories.mutateAsync({
            contactId: result.contact.id,
            categoryIds: selectedCategoryIds
          });
        }

        // Save initial note if provided
        if (result?.contact && initialNoteValue.trim()) {
          await createNote.mutateAsync({
            contact_id: result.contact.id,
            note_content: initialNoteValue.trim(),
          });
        }
      }

      onClose();
      form.reset();
      setSelectedCategoryIds([]);
      setInitialNoteValue("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{readOnly ? "View Contact" : contact ? "Edit Contact" : "Create Contact"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jane Smith" disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Existing Account Selection */}
            <FormField
              control={form.control}
              name="existing_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Existing Account</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      value={field.value || null}
                      onChange={handleAccountChange}
                      disabled={readOnly}
                      placeholder="Select existing account (optional)"
                    />
                  </FormControl>
                  <FormDescription>
                    Select an existing CRM account to link this contact to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company Name (for new account creation) */}
            {!existingAccountId && (
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name (New Account)</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Enter company name for new account"
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>
                      If no existing account is selected, a new account will be created with this name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title / Role</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="VP Sales, Marketing Manager, etc." disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="jane.smith@techcorp.com" disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="work_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="02 1234 5678" disabled={readOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0412 345 678" disabled={readOnly} />
                    </FormControl>
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
                  <FormLabel>Contact Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CONTACT_SOURCES).map(([value, label]) => (
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

            <FormItem>
              <FormLabel>Categories</FormLabel>
              <ContactCategorySelect
                selectedIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
                disabled={readOnly}
              />
              <FormDescription>
                Assign this contact to one or more categories
              </FormDescription>
            </FormItem>

            <ContactNotesSection
              contactId={contact?.id}
              initialNoteValue={initialNoteValue}
              onInitialNoteChange={setInitialNoteValue}
              readOnly={readOnly}
            />

            <div className="flex justify-between gap-2 pt-4">
              <div>
                {canDelete && contact && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Contact
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete this contact? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await deleteContact.mutateAsync(contact.id);
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
                {!readOnly && contact && onConvertToProspect && (
                  <Button type="button" variant="secondary" onClick={handleConvertToProspect}>
                    <Target className="h-4 w-4 mr-2" />
                    Convert to Prospect
                  </Button>
                )}
                {!readOnly && (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : contact ? "Update" : "Create"}
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
