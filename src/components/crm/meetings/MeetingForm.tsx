import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateMeeting, useUpdateMeeting } from "@/hooks/crm/useMeetings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MEETING_TYPES, MEETING_STATUSES } from "@/lib/crm/constants";
import type { CRMMeeting, MeetingType, MeetingStatus } from "@/lib/crm/types";

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  meeting_type: z.enum(["new_contact", "existing_client", "follow_up"]),
  meeting_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  contact_id: z.string().optional().nullable(),
  account_id: z.string().optional().nullable(),
  prospect_id: z.string().optional().nullable(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  owner_id: z.string().optional().nullable(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingFormProps {
  isOpen: boolean;
  onClose: () => void;
  meeting?: CRMMeeting | null;
  initialDate?: Date | null;
}

const MeetingForm: React.FC<MeetingFormProps> = ({ isOpen, onClose, meeting, initialDate }) => {
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      meeting_type: "new_contact",
      meeting_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      end_time: "",
      location: "",
      description: "",
      contact_id: null,
      account_id: null,
      prospect_id: null,
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      status: "scheduled",
      owner_id: null,
    },
  });

  const meetingType = form.watch("meeting_type");

  // State for account/prospect search
  const [accountSearch, setAccountSearch] = useState("");
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [prospectSearch, setProspectSearch] = useState("");
  const [prospectPopoverOpen, setProspectPopoverOpen] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);

  // Fetch CRM users for assignment
  const { data: crmUsers = [] } = useQuery({
    queryKey: ['crm-users-assignable'],
    queryFn: async () => {
      const assignableRoles = ['admin', 'sale_manager', 'sale_user'];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', assignableRoles);

      if (rolesError) throw rolesError;
      if (!rolesData || rolesData.length === 0) return [];

      const userIds = [...new Set(rolesData.map(r => r.user_id))];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;
      return profilesData || [];
    },
  });

  // Fetch accounts - always enabled
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-for-meeting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, email, phone")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Filter accounts based on search
  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  // Fetch prospects
  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects-for-meeting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("id, name, stage")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredProspects = prospects.filter(p =>
    p.name.toLowerCase().includes(prospectSearch.toLowerCase())
  );

  useEffect(() => {
    if (meeting) {
      form.reset({
        title: meeting.title,
        meeting_type: meeting.meeting_type,
        meeting_date: meeting.meeting_date,
        start_time: meeting.start_time,
        end_time: meeting.end_time || "",
        location: meeting.location || "",
        description: meeting.description || "",
        contact_id: meeting.contact_id || null,
        account_id: meeting.account_id || null,
        prospect_id: meeting.prospect_id || null,
        contact_name: meeting.contact_name || "",
        contact_phone: meeting.contact_phone || "",
        contact_email: meeting.contact_email || "",
        status: meeting.status,
        owner_id: meeting.owner_id || null,
      });
    } else {
      // Use initialDate if provided, otherwise use today
      const dateToUse = initialDate || new Date();
      form.reset({
        title: "",
        meeting_type: "new_contact",
        meeting_date: format(dateToUse, "yyyy-MM-dd"),
        start_time: "09:00",
        end_time: "",
        location: "",
        description: "",
        contact_id: null,
        account_id: null,
        prospect_id: null,
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        status: "scheduled",
        owner_id: null,
      });
    }
  }, [meeting, form, isOpen, initialDate]);

  // Auto-fill contact info when account is selected - fetch contact details separately
  const handleAccountChange = async (accountId: string) => {
    form.setValue("account_id", accountId);
    form.setValue("contact_id", null);
    
    const account = accounts.find((a) => a.id === accountId);
    
    // Fetch the contact associated with this account
    const { data: contact } = await supabase
      .from("contacts")
      .select("contact_name, email, phone")
      .eq("converted_to_account_id", accountId)
      .maybeSingle();
    
    if (contact) {
      // Use contact details if available
      form.setValue("contact_name", contact.contact_name || "");
      form.setValue("contact_phone", contact.phone || "");
      form.setValue("contact_email", contact.email || "");
    } else if (account) {
      // Fallback to account details if no contact exists
      form.setValue("contact_name", "");
      form.setValue("contact_phone", account.phone || "");
      form.setValue("contact_email", account.email || "");
    }
    
    setAccountPopoverOpen(false);
    setAccountSearch("");
  };

  const handleClearAccount = () => {
    form.setValue("account_id", null);
    form.setValue("contact_id", null);
    form.setValue("contact_name", "");
    form.setValue("contact_phone", "");
    form.setValue("contact_email", "");
    setAccountPopoverOpen(false);
    setAccountSearch("");
  };

  const onSubmit = async (data: MeetingFormData) => {
    // Get current user for created_by and owner_id
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      title: data.title,
      meeting_type: data.meeting_type,
      meeting_date: data.meeting_date,
      start_time: data.start_time,
      status: data.status,
      contact_id: data.contact_id || undefined,
      account_id: data.account_id || undefined,
      prospect_id: data.prospect_id || undefined,
      end_time: data.end_time || undefined,
      location: data.location || undefined,
      description: data.description || undefined,
      contact_name: data.contact_name || undefined,
      contact_phone: data.contact_phone || undefined,
      contact_email: data.contact_email || undefined,
      created_by: user?.id,
      owner_id: data.owner_id || user?.id,
    };

    if (meeting) {
      updateMeeting.mutate(
        { id: meeting.id, data: payload },
        { onSuccess: () => onClose() }
      );
    } else {
      createMeeting.mutate(payload as any, { onSuccess: () => onClose() });
    }
  };

  const isSubmitting = createMeeting.isPending || updateMeeting.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting ? "Edit Meeting" : "New Meeting"}</DialogTitle>
          <DialogDescription>
            {meeting ? "Update the meeting details below" : "Fill in the details to schedule a new meeting"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-destructive">Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Meeting title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meeting_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-destructive">Meeting Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(MEETING_TYPES) as MeetingType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: MEETING_TYPES[type].color }}
                            />
                            {MEETING_TYPES[type].label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account selector - searchable combobox */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Account Name</FormLabel>
                  <Popover open={accountPopoverOpen} onOpenChange={setAccountPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={accountPopoverOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? accounts.find((a) => a.id === field.value)?.name
                            : "Select an account..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search accounts..."
                          value={accountSearch}
                          onValueChange={setAccountSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No accounts found.</CommandEmpty>
                          <CommandGroup>
                            {field.value && (
                              <CommandItem
                                onSelect={handleClearAccount}
                                className="text-muted-foreground"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Clear selection
                              </CommandItem>
                            )}
                            {filteredAccounts.map((account) => (
                              <CommandItem
                                key={account.id}
                                value={account.id}
                                onSelect={() => handleAccountChange(account.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === account.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {account.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prospect selector */}
            <FormField
              control={form.control}
              name="prospect_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prospect</FormLabel>
                  <Popover open={prospectPopoverOpen} onOpenChange={setProspectPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={prospectPopoverOpen}
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? prospects.find((p) => p.id === field.value)?.name
                            : "Select a prospect..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search prospects..."
                          value={prospectSearch}
                          onValueChange={setProspectSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No prospects found.</CommandEmpty>
                          <CommandGroup>
                            {field.value && (
                              <CommandItem
                                onSelect={() => { field.onChange(null); setProspectPopoverOpen(false); setProspectSearch(""); }}
                                className="text-muted-foreground"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Clear selection
                              </CommandItem>
                            )}
                            {filteredProspects.map((prospect) => (
                              <CommandItem
                                key={prospect.id}
                                value={prospect.id}
                                onSelect={() => { field.onChange(prospect.id); setProspectPopoverOpen(false); setProspectSearch(""); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", field.value === prospect.id ? "opacity-100" : "opacity-0")} />
                                {prospect.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meeting_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-destructive">Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(MEETING_STATUSES) as MeetingStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {MEETING_STATUSES[status].label}
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
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-destructive">Start Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Office, Video Call, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assign To - Owner selection */}
            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => {
                const selectedUser = crmUsers?.find(u => u.id === field.value);
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assign To</FormLabel>
                    <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedUser?.full_name || selectedUser?.email || "Select user..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {field.value && (
                                <CommandItem
                                  onSelect={() => {
                                    field.onChange(null);
                                    setOwnerPopoverOpen(false);
                                  }}
                                  className="text-muted-foreground"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Clear selection
                                </CommandItem>
                              )}
                              {crmUsers?.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.full_name || user.email || user.id}
                                  onSelect={() => {
                                    field.onChange(user.id);
                                    setOwnerPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === user.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {user.full_name || user.email}
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Meeting notes or agenda..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : meeting ? "Update Meeting" : "Create Meeting"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingForm;
