import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CreditCard,
  DollarSign,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";

interface ServiceCredit {
  id: string;
  customer_id: string;
  customer_name?: string;
  incident_id: string | null;
  credit_amount: number;
  credit_type: string;
  breach_type: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

const serviceCreditSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  incident_id: z.string().nullable(),
  credit_amount: z.number().min(0.01, "Credit amount must be greater than 0"),
  credit_type: z.string().min(1, "Credit type is required"),
  breach_type: z.string().nullable(),
  status: z.string().min(1, "Status is required"),
  description: z.string().nullable(),
});

type ServiceCreditFormData = z.infer<typeof serviceCreditSchema>;

const creditTypeOptions = [
  { value: "sla_breach", label: "SLA Breach" },
  { value: "goodwill", label: "Goodwill" },
  { value: "promotional", label: "Promotional" },
  { value: "error_compensation", label: "Error Compensation" },
];

const breachTypeOptions = [
  { value: "response_sla", label: "Response SLA" },
  { value: "resolution_sla", label: "Resolution SLA" },
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "applied", label: "Applied" },
  { value: "expired", label: "Expired" },
];

export function ServiceCreditsManagement() {
  const [credits, setCredits] = useState<ServiceCredit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCredit, setEditingCredit] = useState<ServiceCredit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const form = useForm<ServiceCreditFormData>({
    resolver: zodResolver(serviceCreditSchema),
    defaultValues: {
      customer_id: "",
      incident_id: null,
      credit_amount: 0,
      credit_type: "goodwill",
      breach_type: null,
      status: "pending",
      description: null,
    },
  });

  const watchCreditType = form.watch('credit_type');

  useEffect(() => {
    fetchData();
  }, [filterCustomer, filterStatus]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Build query for service credits
      let query = supabase
        .from('service_credits')
        .select(`
          *,
          customers:customer_id (name)
        `)
        .order('created_at', { ascending: false });

      if (filterCustomer) {
        query = query.eq('customer_id', filterCustomer);
      }
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data: creditsData, error: creditsError } = await query;

      if (creditsError) throw creditsError;

      const formattedCredits = (creditsData || []).map((c: any) => ({
        ...c,
        customer_name: c.customers?.name || 'Unknown',
      }));
      setCredits(formattedCredits);

      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setCustomers(customersData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load service credits');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ServiceCreditFormData) => {
    try {
      const payload = {
        customer_id: data.customer_id,
        incident_id: data.incident_id || null,
        credit_amount: data.credit_amount,
        credit_type: data.credit_type,
        breach_type: data.credit_type === 'sla_breach' ? data.breach_type : null,
        status: data.status,
        description: data.description || null,
      };

      if (editingCredit) {
        const { error } = await supabase
          .from('service_credits')
          .update(payload)
          .eq('id', editingCredit.id);
        if (error) throw error;
        toast.success('Service credit updated');
      } else {
        const { error } = await supabase
          .from('service_credits')
          .insert(payload);
        if (error) throw error;
        toast.success('Service credit created');
      }
      
      setDialogOpen(false);
      form.reset();
      setEditingCredit(null);
      fetchData();
    } catch (error) {
      console.error("Error saving service credit:", error);
      toast.error('Failed to save service credit');
    }
  };

  const handleEdit = (credit: ServiceCredit) => {
    setEditingCredit(credit);
    form.reset({
      customer_id: credit.customer_id,
      incident_id: credit.incident_id,
      credit_amount: credit.credit_amount,
      credit_type: credit.credit_type,
      breach_type: credit.breach_type,
      status: credit.status,
      description: credit.description,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (creditId: string) => {
    if (confirm("Are you sure you want to delete this service credit?")) {
      try {
        const { error } = await supabase
          .from('service_credits')
          .delete()
          .eq('id', creditId);
        if (error) throw error;
        toast.success('Service credit deleted');
        fetchData();
      } catch (error) {
        console.error("Error deleting service credit:", error);
        toast.error('Failed to delete service credit');
      }
    }
  };

  const handleApplyCredit = async (creditId: string) => {
    try {
      const { error } = await supabase
        .from('service_credits')
        .update({ status: 'applied' })
        .eq('id', creditId);
      if (error) throw error;
      toast.success('Credit applied');
      fetchData();
    } catch (error) {
      console.error("Error applying credit:", error);
      toast.error('Failed to apply credit');
    }
  };

  const handleExpireCredit = async (creditId: string) => {
    try {
      const { error } = await supabase
        .from('service_credits')
        .update({ status: 'expired' })
        .eq('id', creditId);
      if (error) throw error;
      toast.success('Credit expired');
      fetchData();
    } catch (error) {
      console.error("Error expiring credit:", error);
      toast.error('Failed to expire credit');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'applied':
        return <Badge variant="default" className="bg-green-600">Applied</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCreditTypeBadge = (type: string) => {
    switch (type) {
      case 'sla_breach':
        return <Badge variant="destructive">SLA Breach</Badge>;
      case 'goodwill':
        return <Badge variant="secondary">Goodwill</Badge>;
      case 'promotional':
        return <Badge className="bg-blue-600">Promotional</Badge>;
      case 'error_compensation':
        return <Badge variant="outline">Error Comp</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Calculate totals
  const pendingTotal = credits.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.credit_amount), 0);
  const appliedTotal = credits.filter(c => c.status === 'applied').reduce((sum, c) => sum + Number(c.credit_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Credits</h2>
          <p className="text-muted-foreground">
            Manage service credits for SLA breaches and goodwill
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            form.reset();
            setEditingCredit(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Credit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCredit ? "Edit Service Credit" : "Create Service Credit"}
              </DialogTitle>
              <DialogDescription>
                {editingCredit 
                  ? "Update the service credit details below" 
                  : "Create a new service credit for a customer"
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="credit_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Amount ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
                    name="credit_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {creditTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchCreditType === 'sla_breach' && (
                    <FormField
                      control={form.control}
                      name="breach_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Breach Type</FormLabel>
                          <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select breach type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {breachTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Reason for credit..."
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCredit ? "Update" : "Create"} Credit
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Credits</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingTotal)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applied Credits</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(appliedTotal)}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold">{credits.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All customers</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterCustomer || filterStatus) && (
          <Button variant="ghost" onClick={() => { setFilterCustomer(''); setFilterStatus(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Service Credits
          </CardTitle>
          <CardDescription>
            View and manage service credits for all customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading service credits...</div>
          ) : !credits?.length ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No service credits found</h3>
              <p className="text-muted-foreground mb-4">
                {filterCustomer || filterStatus 
                  ? "No credits match your filters" 
                  : "Create your first service credit"}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Credit
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{credit.customer_name}</span>
                        {credit.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {credit.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(credit.credit_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getCreditTypeBadge(credit.credit_type)}
                      {credit.breach_type && (
                        <Badge variant="outline" className="ml-1 text-xs">
                          {credit.breach_type === 'response_sla' ? 'Response' : 'Resolution'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(credit.status)}</TableCell>
                    <TableCell>
                      {format(new Date(credit.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {credit.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApplyCredit(credit.id)}
                              title="Apply credit"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExpireCredit(credit.id)}
                              title="Expire credit"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(credit)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(credit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
