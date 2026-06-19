
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Customer, saveCustomer, checkCustomerNameExists } from "@/lib/customer-service";
import { AUSTRALIAN_STATES, INDUSTRIES, ACCOUNT_SEGMENTS } from "@/lib/crm/constants";
import CustomerLiaisonList from "./CustomerLiaisonList";

interface AddEditCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingCustomer: Customer | null;
}

type FormValues = {
  name: string;
  has_trading_name: boolean;
  trading_name: string;
  abn: string;
  acn: string;
  industry: string;
  segment: string;
  website: string;
  street_address: string;
  suburb: string;
  state_au: string;
  postcode: string;
  postal_different: boolean;
  postal_street_address: string;
  postal_suburb: string;
  postal_state: string;
  postal_postcode: string;
  email: string;
  account_email: string;
};

const AddEditCustomerDialog: React.FC<AddEditCustomerDialogProps> = ({ 
  isOpen, 
  onClose,
  existingCustomer 
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!existingCustomer;
  const [nameValidation, setNameValidation] = useState<{
    isChecking: boolean;
    isDuplicate: boolean;
    message?: string;
  }>({ isChecking: false, isDuplicate: false });

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      has_trading_name: false,
      trading_name: "",
      abn: "",
      acn: "",
      industry: "",
      segment: "",
      website: "",
      street_address: "",
      suburb: "",
      state_au: "",
      postcode: "",
      postal_different: false,
      postal_street_address: "",
      postal_suburb: "",
      postal_state: "",
      postal_postcode: "",
      email: "",
      account_email: "",
    }
  });

  const hasTradingName = form.watch("has_trading_name");
  const postalDifferent = form.watch("postal_different");

  // Reset form when dialog opens/closes or customer changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: existingCustomer?.name || "",
        has_trading_name: existingCustomer?.has_trading_name || false,
        trading_name: existingCustomer?.trading_name || "",
        abn: existingCustomer?.abn || "",
        acn: existingCustomer?.acn || "",
        industry: existingCustomer?.industry || "",
        segment: existingCustomer?.segment || "",
        website: existingCustomer?.website || "",
        street_address: existingCustomer?.street_address || "",
        suburb: existingCustomer?.suburb || "",
        state_au: existingCustomer?.state_au || "",
        postcode: existingCustomer?.postcode || "",
        postal_different: existingCustomer?.postal_different || false,
        postal_street_address: existingCustomer?.postal_street_address || "",
        postal_suburb: existingCustomer?.postal_suburb || "",
        postal_state: existingCustomer?.postal_state || "",
        postal_postcode: existingCustomer?.postal_postcode || "",
        email: existingCustomer?.email || "",
        account_email: existingCustomer?.account_email || "",
      });
      setNameValidation({ isChecking: false, isDuplicate: false });
    }
  }, [form, isOpen, existingCustomer]);

  // Real-time name validation
  const validateCustomerName = async (name: string) => {
    if (!name.trim() || name === existingCustomer?.name) {
      setNameValidation({ isChecking: false, isDuplicate: false });
      return;
    }

    setNameValidation({ isChecking: true, isDuplicate: false });

    try {
      const exists = await checkCustomerNameExists(name, existingCustomer?.id);
      if (exists) {
        setNameValidation({
          isChecking: false,
          isDuplicate: true,
          message: `A customer with the name "${name}" already exists.`
        });
      } else {
        setNameValidation({ isChecking: false, isDuplicate: false });
      }
    } catch (error) {
      console.error("Error validating customer name:", error);
      setNameValidation({ isChecking: false, isDuplicate: false });
    }
  };

  // Debounced name validation
  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (fieldName === 'name' && value.name) {
        const timeoutId = setTimeout(() => {
          validateCustomerName(value.name || '');
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, existingCustomer]);

  // Create or update customer mutation
  const mutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      const customerData: Partial<Customer> = {
        id: existingCustomer?.id,
        name: formData.name,
        has_trading_name: formData.has_trading_name,
        trading_name: formData.has_trading_name ? formData.trading_name : undefined,
        abn: formData.abn,
        acn: formData.acn,
        industry: formData.industry,
        segment: formData.segment,
        website: formData.website,
        street_address: formData.street_address,
        suburb: formData.suburb,
        state_au: formData.state_au,
        postcode: formData.postcode,
        postal_different: formData.postal_different,
        postal_street_address: formData.postal_different ? formData.postal_street_address : undefined,
        postal_suburb: formData.postal_different ? formData.postal_suburb : undefined,
        postal_state: formData.postal_different ? formData.postal_state : undefined,
        postal_postcode: formData.postal_different ? formData.postal_postcode : undefined,
        email: formData.email,
        account_email: formData.account_email,
      };

      return saveCustomer(customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: isEditing ? "Customer updated" : "Customer created",
        description: isEditing 
          ? "The customer has been updated successfully." 
          : "New customer has been created successfully.",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} customer. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (nameValidation.isDuplicate) {
      toast({
        title: "Duplicate customer name",
        description: nameValidation.message,
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter customer name" 
                      required 
                      {...field}
                      className={nameValidation.isDuplicate ? "border-destructive" : ""}
                    />
                  </FormControl>
                  {nameValidation.isChecking && (
                    <p className="text-sm text-muted-foreground">Checking name availability...</p>
                  )}
                  {nameValidation.isDuplicate && (
                    <p className="text-sm text-destructive">{nameValidation.message}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Trading Name Checkbox */}
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
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Company/Trading name is different
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Trading Name Field (conditional) */}
            {hasTradingName && (
              <FormField
                control={form.control}
                name="trading_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Trading name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Separator />

            {/* Business Identification */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Business Identification</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="abn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ABN</FormLabel>
                      <FormControl>
                        <Input placeholder="Australian Business Number" {...field} />
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
                        <Input placeholder="Australian Company Number" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
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
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Address */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
              <FormField
                control={form.control}
                name="street_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
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
                        <Input placeholder="Suburb" {...field} />
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
                            <SelectValue placeholder="State" />
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
                        <Input placeholder="Postcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Postal Address Checkbox */}
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
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Postal address is different from above
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Postal Address Fields (conditional) */}
            {postalDifferent && (
              <div className="space-y-2 pl-6 border-l-2 border-muted">
                <FormField
                  control={form.control}
                  name="postal_street_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal street address" {...field} />
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
                          <Input placeholder="Suburb" {...field} />
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
                              <SelectValue placeholder="State" />
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
                          <Input placeholder="Postcode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Contact */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Primary email" {...field} />
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
                      <FormLabel>Account Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="For invoicing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Liaisons Section - only show when editing */}
            {isEditing && existingCustomer?.id && (
              <>
                <Separator className="my-4" />
                <CustomerLiaisonList customerId={existingCustomer.id} />
              </>
            )}
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending || nameValidation.isDuplicate || nameValidation.isChecking}
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update Customer" : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditCustomerDialog;
