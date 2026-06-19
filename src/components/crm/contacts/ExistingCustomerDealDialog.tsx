import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users, Check, ChevronsUpDown, Building2, User, ArrowRight, ArrowLeft, Plus, Mail, Phone } from "lucide-react";
import { format, addWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateDeal } from "@/hooks/crm/useDeals";
import { usePipelineStages } from "@/hooks/crm/usePipelineStages";
import { useCreateDealStageNote } from "@/hooks/crm/useDealStageNotes";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchCustomers, fetchCustomerLiaisons, Customer, CustomerLiaison } from "@/lib/customer-service";
import { useCreateAccountFromCustomer } from "@/hooks/crm/useCreateAccountFromCustomer";

// Step types
type Step = "select-customer" | "select-contact" | "enter-contact" | "create-deal";

const dealSchema = z.object({
  name: z.string().min(1, "Deal name is required").max(100),
  amount: z.coerce.number().min(0, "Amount must be positive").optional(),
  close_date: z.date({ required_error: "Expected close date is required" }),
  description: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface ExistingCustomerDealDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExistingCustomerDealDialog({ open, onClose }: ExistingCustomerDealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createDeal = useCreateDeal();
  const createAccountFromCustomer = useCreateAccountFromCustomer();
  const createStageNote = useCreateDealStageNote();
  const { data: stages } = usePipelineStages();
  
  const [step, setStep] = useState<Step>("select-customer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false);
  
  // Selected data
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLiaison, setSelectedLiaison] = useState<CustomerLiaison | null>(null);
  const [useNewContact, setUseNewContact] = useState(false);
  const [manualContact, setManualContact] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
  });
  
  const firstStage = stages?.filter(s => s.is_active)?.[0];
  
  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    enabled: open,
  });
  
  // Fetch liaisons when customer is selected
  const { data: liaisons, isLoading: liaisonsLoading } = useQuery({
    queryKey: ['customer-liaisons', selectedCustomer?.id],
    queryFn: () => selectedCustomer ? fetchCustomerLiaisons(selectedCustomer.id) : Promise.resolve([]),
    enabled: !!selectedCustomer,
  });
  
  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name: "",
      amount: undefined,
      close_date: addWeeks(new Date(), 2),
      description: "",
    },
  });
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("select-customer");
      setSelectedCustomer(null);
      setSelectedLiaison(null);
      setUseNewContact(false);
      setManualContact({ name: "", email: "", phone: "", title: "" });
      form.reset({
        name: "",
        amount: undefined,
        close_date: addWeeks(new Date(), 2),
        description: "",
      });
    }
  }, [open, form]);
  
  // Update deal name when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      form.setValue("name", `${selectedCustomer.name} Deal`);
    }
  }, [selectedCustomer, form]);
  
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerComboboxOpen(false);
  };
  
  const handleNextFromCustomer = () => {
    if (!selectedCustomer) return;
    
    if (liaisons && liaisons.length > 0) {
      // Pre-select primary liaison if exists
      const primary = liaisons.find(l => l.is_primary);
      if (primary) {
        setSelectedLiaison(primary);
      }
      setStep("select-contact");
    } else {
      // No liaisons, go to manual entry
      setStep("enter-contact");
    }
  };
  
  const handleSelectContact = (liaison: CustomerLiaison | null) => {
    if (liaison) {
      setSelectedLiaison(liaison);
      setUseNewContact(false);
    } else {
      setSelectedLiaison(null);
      setUseNewContact(true);
    }
  };
  
  const handleNextFromContact = () => {
    if (useNewContact) {
      setStep("enter-contact");
    } else if (selectedLiaison) {
      setStep("create-deal");
    }
  };
  
  const handleNextFromManualContact = () => {
    if (!manualContact.name.trim()) {
      toast({
        title: "Error",
        description: "Contact name is required",
        variant: "destructive",
      });
      return;
    }
    setStep("create-deal");
  };
  
  const handleBack = () => {
    if (step === "select-contact") {
      setStep("select-customer");
    } else if (step === "enter-contact") {
      if (liaisons && liaisons.length > 0) {
        setStep("select-contact");
      } else {
        setStep("select-customer");
      }
    } else if (step === "create-deal") {
      if (useNewContact || !selectedLiaison) {
        setStep("enter-contact");
      } else {
        setStep("select-contact");
      }
    }
  };
  
  const onSubmit = async (data: DealFormData) => {
    if (!selectedCustomer || !user) return;
    
    setIsSubmitting(true);
    try {
      // Step 1: Create Account and Contact from customer
      const { account, contact } = await createAccountFromCustomer.mutateAsync({
        customer: selectedCustomer,
        liaison: selectedLiaison || undefined,
        manualContact: useNewContact || !selectedLiaison ? {
          name: manualContact.name || selectedCustomer.name,
          email: manualContact.email,
          phone: manualContact.phone,
          title: manualContact.title,
        } : undefined,
        ownerId: user.id,
      });
      
      // Step 2: Create Deal
      const newDeal = await createDeal.mutateAsync({
        name: data.name,
        account_id: account.id,
        pipeline_stage_id: firstStage?.id || "",
        primary_contact_id: contact.id,
        amount: data.amount || null,
        close_date: format(data.close_date, "yyyy-MM-dd"),
        source: "referral",
        owner_id: user.id,
        created_by: user.id,
      } as any);

      // Step 3: Create initial stage note from the description/notes field
      if (data.description?.trim() && firstStage) {
        await createStageNote.mutateAsync({
          deal_id: newDeal.id,
          stage_id: firstStage.id,
          stage_name: firstStage.name,
          note_content: data.description.trim(),
        });
      }

      toast({
        title: "Success",
        description: "Deal created from existing customer",
      });
      
      onClose();
    } catch (error) {
      console.error("Error creating deal from customer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <DialogTitle>Create Deal from Existing Customer</DialogTitle>
          </div>
          <DialogDescription>
            Select an existing customer to create a new deal with associated account and contact.
          </DialogDescription>
        </DialogHeader>
        
        {/* Step 1: Select Customer */}
        {step === "select-customer" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <Popover open={customerComboboxOpen} onOpenChange={setCustomerComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !selectedCustomer && "text-muted-foreground"
                    )}
                  >
                    {selectedCustomer ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {selectedCustomer.name}
                      </div>
                    ) : (
                      "Search and select customer..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customers..." />
                    <CommandList>
                      <CommandEmpty>
                        {customersLoading ? "Loading..." : "No customers found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => handleSelectCustomer(customer)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              {customer.industry && (
                                <span className="text-xs text-muted-foreground">{customer.industry}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {selectedCustomer && (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedCustomer.name}</span>
                    {selectedCustomer.segment && (
                      <Badge variant="secondary">{selectedCustomer.segment}</Badge>
                    )}
                  </div>
                  {selectedCustomer.abn && (
                    <p className="text-sm text-muted-foreground">ABN: {selectedCustomer.abn}</p>
                  )}
                  {selectedCustomer.industry && (
                    <p className="text-sm text-muted-foreground">Industry: {selectedCustomer.industry}</p>
                  )}
                  {selectedCustomer.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {selectedCustomer.email}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleNextFromCustomer}
                disabled={!selectedCustomer}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 2: Select Contact (if liaisons exist) */}
        {step === "select-contact" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Contact from {selectedCustomer?.name}</Label>
              <p className="text-sm text-muted-foreground">
                Choose an existing liaison or add a new contact for this deal.
              </p>
            </div>
            
            {liaisonsLoading ? (
              <p className="text-center py-4 text-muted-foreground">Loading contacts...</p>
            ) : (
              <RadioGroup
                value={useNewContact ? "new" : selectedLiaison?.id || ""}
                onValueChange={(value) => {
                  if (value === "new") {
                    handleSelectContact(null);
                  } else {
                    const liaison = liaisons?.find(l => l.id === value);
                    if (liaison) handleSelectContact(liaison);
                  }
                }}
              >
                <div className="space-y-2">
                  {liaisons?.map((liaison) => (
                    <div key={liaison.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={liaison.id} id={liaison.id} />
                      <Label htmlFor={liaison.id} className="flex-1 cursor-pointer">
                        <Card className={cn(
                          "p-3",
                          selectedLiaison?.id === liaison.id && "border-primary"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{liaison.name}</span>
                              {liaison.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                            {liaison.title && <p>{liaison.title}</p>}
                            {liaison.email && (
                              <p className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {liaison.email}
                              </p>
                            )}
                            {liaison.phone && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {liaison.phone}
                              </p>
                            )}
                          </div>
                        </Card>
                      </Label>
                    </div>
                  ))}
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new-contact" />
                    <Label htmlFor="new-contact" className="flex-1 cursor-pointer">
                      <Card className={cn(
                        "p-3",
                        useNewContact && "border-primary"
                      )}>
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                          <span>Add new contact...</span>
                        </div>
                      </Card>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            )}
            
            <div className="flex justify-between gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleNextFromContact}
                disabled={!selectedLiaison && !useNewContact}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Enter Contact Details (manual) */}
        {step === "enter-contact" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Details</Label>
              <p className="text-sm text-muted-foreground">
                Enter contact information for this deal.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name *</Label>
                <Input
                  id="contact-name"
                  value={manualContact.name}
                  onChange={(e) => setManualContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-title">Title / Role</Label>
                <Input
                  id="contact-title"
                  value={manualContact.title}
                  onChange={(e) => setManualContact(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="VP Sales, Account Manager, etc."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={manualContact.email}
                    onChange={(e) => setManualContact(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="jane@company.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={manualContact.phone}
                    onChange={(e) => setManualContact(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0412 345 678"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleNextFromManualContact}
                disabled={!manualContact.name.trim()}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 4: Create Deal */}
        {step === "create-deal" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enterprise License Agreement" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                  name="close_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expected Close Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
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
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Add notes about this deal qualification and next steps..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Summary:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Customer:</strong> {selectedCustomer?.name}</li>
                  <li>• <strong>Contact:</strong> {selectedLiaison?.name || manualContact.name}</li>
                  {firstStage && <li>• <strong>Pipeline Stage:</strong> {firstStage.name}</li>}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  An account and contact will be created/linked automatically.
                </p>
              </div>

              <div className="flex justify-between gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Deal"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
