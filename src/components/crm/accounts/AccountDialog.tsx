import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/crm/useAccounts";
import { useAuth } from "@/context/AuthContext";
import type { Account, CreateAccountDTO } from "@/lib/crm/types";
import { ACCOUNT_SEGMENTS, AUSTRALIAN_STATES } from "@/lib/crm/constants";
import { Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  has_trading_name: z.boolean().default(false),
  trading_name: z.string().max(100).optional(),
  
  // Business identification
  abn: z.string().max(14).optional(), // 11 digits + 2 spaces
  acn: z.string().max(11).optional(), // 9 digits + 2 spaces
  
  // Business details
  industry: z.string().optional(),
  segment: z.enum(["enterprise", "mid_market", "small_business", "startup"]).optional(),
  website: z.string()
    .optional()
    .transform((val) => {
      if (!val || val === "") return "";
      if (!/^https?:\/\//i.test(val)) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(z.string().url().optional().or(z.literal(""))),
  
  // Main address
  street_address: z.string().optional(),
  suburb: z.string().optional(),
  state_au: z.string().optional(),
  postcode: z.string().max(4).optional(),
  
  // Postal address
  postal_different: z.boolean().default(false),
  postal_street_address: z.string().optional(),
  postal_suburb: z.string().optional(),
  postal_state: z.string().optional(),
  postal_postcode: z.string().max(4).optional(),
  
  // Contact
  email: z.string().email().optional().or(z.literal("")),
  account_email: z.string().email().optional().or(z.literal("")),
  
  // Other details
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  account?: Account;
}

export function AccountDialog({ open, onClose, account }: AccountDialogProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAugmenting, setIsAugmenting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = userRole === "admin";

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: account?.name || "",
      has_trading_name: account?.has_trading_name || false,
      trading_name: account?.trading_name || "",
      abn: account?.abn || "",
      acn: account?.acn || "",
      industry: account?.industry || "",
      segment: account?.segment || undefined,
      website: account?.website || "",
      street_address: account?.street_address || "",
      suburb: account?.suburb || "",
      state_au: account?.state_au || "",
      postcode: account?.postcode || "",
      postal_different: account?.postal_different || false,
      postal_street_address: account?.postal_street_address || "",
      postal_suburb: account?.postal_suburb || "",
      postal_state: account?.postal_state || "",
      postal_postcode: account?.postal_postcode || "",
      email: account?.email || "",
      account_email: account?.account_email || "",
      description: account?.description || "",
    },
  });

  const hasTradingName = form.watch("has_trading_name");
  const postalDifferent = form.watch("postal_different");

  useEffect(() => {
    if (open) {
      form.reset({
        name: account?.name || "",
        has_trading_name: account?.has_trading_name || false,
        trading_name: account?.trading_name || "",
        abn: account?.abn || "",
        acn: account?.acn || "",
        industry: account?.industry || "",
        segment: account?.segment || undefined,
        website: account?.website || "",
        street_address: account?.street_address || "",
        suburb: account?.suburb || "",
        state_au: account?.state_au || "",
        postcode: account?.postcode || "",
        postal_different: account?.postal_different || false,
        postal_street_address: account?.postal_street_address || "",
        postal_suburb: account?.postal_suburb || "",
        postal_state: account?.postal_state || "",
        postal_postcode: account?.postal_postcode || "",
        email: account?.email || "",
        account_email: account?.account_email || "",
        description: account?.description || "",
      });
    }
  }, [open, account]);

  const handleAIAugment = async () => {
    const name = form.watch("name");
    const website = form.watch("website");

    if (!name && !website) {
      toast({
        title: "Missing Information",
        description: "Please enter a company name or website first",
        variant: "destructive",
      });
      return;
    }

    setIsAugmenting(true);
    try {
      const { data, error } = await supabase.functions.invoke('augment-account-info', {
        body: { name, website }
      });

      if (error) {
        console.error('AI Augment error:', error);
        toast({
          title: "AI Augment Failed",
          description: error.message || "Failed to fetch company information",
          variant: "destructive",
        });
        return;
      }

      let fieldsUpdated = 0;

      if (data.industry && !form.getValues("industry")) {
        form.setValue("industry", data.industry);
        fieldsUpdated++;
      }
      if (data.description && !form.getValues("description")) {
        form.setValue("description", data.description);
        fieldsUpdated++;
      }
      if (data.email && !form.getValues("email")) {
        form.setValue("email", data.email);
        fieldsUpdated++;
      }
      if (data.segment && !form.getValues("segment")) {
        form.setValue("segment", data.segment);
        fieldsUpdated++;
      }

      toast({
        title: "AI Augment Complete",
        description: fieldsUpdated > 0 
          ? `Updated ${fieldsUpdated} field${fieldsUpdated > 1 ? 's' : ''} with company information`
          : "No new information found (fields already filled)",
      });

    } catch (err) {
      console.error('AI Augment error:', err);
      toast({
        title: "AI Augment Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAugmenting(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    await deleteAccount.mutateAsync(account.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true);
    try {
      if (account) {
        await updateAccount.mutateAsync({ id: account.id, updates: data });
      } else {
        await createAccount.mutateAsync({
          ...data,
          is_active: true,
          created_by: user?.id || "",
          owner_id: user?.id || "",
        } as CreateAccountDTO);
      }
      form.reset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{account?.name}</strong>? This action cannot be undone and will remove all data associated with this account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? "Edit Account" : "Create Account"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Corporation Pty Ltd" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Trading Name Section */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="has_trading_name"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Company/Trading name is different
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              {hasTradingName && (
                <FormField
                  control={form.control}
                  name="trading_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trading Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Acme Trading" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Business Identification */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Business Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="abn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ABN</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12 345 678 901" maxLength={14} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="acn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ACN</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 456 789" maxLength={11} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Industry & Segment */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Technology" />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ACCOUNT_SEGMENTS).map(([value, label]) => (
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

            {/* Website */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://acme.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
              <FormField
                control={form.control}
                name="street_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main Street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="suburb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suburb</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Sydney" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state_au"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AUSTRALIAN_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.value}
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
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="2000" maxLength={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Postal Address Section */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="postal_different"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Postal address is different from above
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              {postalDifferent && (
                <div className="space-y-3 pl-6 border-l-2 border-muted">
                  <FormField
                    control={form.control}
                    name="postal_street_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="PO Box 123" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="postal_suburb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suburb</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Sydney" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postal_state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AUSTRALIAN_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.value}
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
                      name="postal_postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="2000" maxLength={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Contact Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contact@acme.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Email (for invoicing)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="accounts@acme.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>


            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes about this account" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-4">
              <div>
                {account && isAdmin && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteAccount.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAIAugment}
                  disabled={isAugmenting || (!form.watch("name") && !form.watch("website"))}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isAugmenting ? "Searching..." : "AI Augment"}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : account ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
