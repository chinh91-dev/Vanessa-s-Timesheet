import { useState, useEffect } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileText,
  Clock,
  DollarSign,
  Percent
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

interface SlaAgreement {
  id: string;
  customer_id: string;
  customer_name?: string;
  incident_project_id: string | null;
  priority_id: string | null;
  response_sla_minutes: number;
  resolution_sla_minutes: number;
  service_credit_rate: number;
  monthly_service_fee: number;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Priority {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

const slaAgreementSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  incident_project_id: z.string().nullable(),
  priority_id: z.string().nullable(),
  response_sla_minutes: z.number().min(1, "Response SLA must be at least 1 minute"),
  resolution_sla_minutes: z.number().min(1, "Resolution SLA must be at least 1 minute"),
  service_credit_rate: z.number().min(0).max(1, "Credit rate must be between 0 and 1"),
  monthly_service_fee: z.number().min(0, "Monthly fee must be 0 or higher"),
  is_active: z.boolean(),
  effective_from: z.string().min(1, "Effective from date is required"),
  effective_until: z.string().nullable(),
});

type SlaAgreementFormData = z.infer<typeof slaAgreementSchema>;

export function CustomerSlaAgreementManagement() {
  const [agreements, setAgreements] = useState<SlaAgreement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAgreement, setEditingAgreement] = useState<SlaAgreement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<SlaAgreementFormData>({
    resolver: zodResolver(slaAgreementSchema),
    defaultValues: {
      customer_id: "",
      incident_project_id: null,
      priority_id: null,
      response_sla_minutes: 60,
      resolution_sla_minutes: 480,
      service_credit_rate: 0.05,
      monthly_service_fee: 0,
      is_active: true,
      effective_from: todayLocalYMD(),
      effective_until: null,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch SLA agreements with customer names
      const { data: agreementsData, error: agreementsError } = await supabase
        .from('customer_sla_agreements')
        .select(`
          *,
          customers:customer_id (name)
        `)
        .order('created_at', { ascending: false });

      if (agreementsError) throw agreementsError;

      const formattedAgreements = (agreementsData || []).map((a: any) => ({
        ...a,
        customer_name: a.customers?.name || 'Unknown',
      }));
      setAgreements(formattedAgreements);

      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setCustomers(customersData || []);

      // Fetch priorities
      const { data: prioritiesData } = await supabase
        .from('incident_priorities')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      setPriorities(prioritiesData || []);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('incident_projects')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setProjects(projectsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load SLA agreements');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SlaAgreementFormData) => {
    try {
      const payload = {
        customer_id: data.customer_id,
        incident_project_id: data.incident_project_id || null,
        priority_id: data.priority_id || null,
        response_sla_minutes: data.response_sla_minutes,
        resolution_sla_minutes: data.resolution_sla_minutes,
        service_credit_rate: data.service_credit_rate,
        monthly_service_fee: data.monthly_service_fee,
        is_active: data.is_active,
        effective_from: data.effective_from,
        effective_until: data.effective_until || null,
      };

      if (editingAgreement) {
        const { error } = await supabase
          .from('customer_sla_agreements')
          .update(payload)
          .eq('id', editingAgreement.id);
        if (error) throw error;
        toast.success('SLA Agreement updated');
      } else {
        const { error } = await supabase
          .from('customer_sla_agreements')
          .insert(payload);
        if (error) throw error;
        toast.success('SLA Agreement created');
      }
      
      setDialogOpen(false);
      form.reset();
      setEditingAgreement(null);
      fetchData();
    } catch (error) {
      console.error("Error saving SLA agreement:", error);
      toast.error('Failed to save SLA agreement');
    }
  };

  const handleEdit = (agreement: SlaAgreement) => {
    setEditingAgreement(agreement);
    form.reset({
      customer_id: agreement.customer_id,
      incident_project_id: agreement.incident_project_id,
      priority_id: agreement.priority_id,
      response_sla_minutes: agreement.response_sla_minutes,
      resolution_sla_minutes: agreement.resolution_sla_minutes,
      service_credit_rate: agreement.service_credit_rate,
      monthly_service_fee: agreement.monthly_service_fee,
      is_active: agreement.is_active,
      effective_from: agreement.effective_from,
      effective_until: agreement.effective_until,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (agreementId: string) => {
    if (confirm("Are you sure you want to delete this SLA agreement?")) {
      try {
        const { error } = await supabase
          .from('customer_sla_agreements')
          .delete()
          .eq('id', agreementId);
        if (error) throw error;
        toast.success('SLA Agreement deleted');
        fetchData();
      } catch (error) {
        console.error("Error deleting SLA agreement:", error);
        toast.error('Failed to delete SLA agreement');
      }
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer SLA Agreements</h2>
          <p className="text-muted-foreground">
            Configure SLA terms and service credit rates for each customer
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            form.reset();
            setEditingAgreement(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add SLA Agreement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAgreement ? "Edit SLA Agreement" : "Create SLA Agreement"}
              </DialogTitle>
              <DialogDescription>
                {editingAgreement 
                  ? "Update the SLA agreement settings below" 
                  : "Create a new customer SLA agreement with service credit terms"
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
                    name="incident_project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project (Optional)</FormLabel>
                        <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All projects" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">All projects</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
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
                    name="priority_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (Optional)</FormLabel>
                        <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All priorities" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">All priorities</SelectItem>
                            {priorities.map((priority) => (
                              <SelectItem key={priority.id} value={priority.id}>
                                {priority.name}
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
                    name="response_sla_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response SLA (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resolution_sla_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resolution SLA (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="service_credit_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Credit Rate (0-1)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
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
                    name="monthly_service_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Service Fee ($)</FormLabel>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="effective_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective From</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="effective_until"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective Until (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Enable this SLA agreement
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                    {editingAgreement ? "Update" : "Create"} Agreement
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SLA Agreements
          </CardTitle>
          <CardDescription>
            Manage customer-specific SLA terms and service credit rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading SLA agreements...</div>
          ) : !agreements?.length ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No SLA agreements configured</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first customer SLA agreement
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Agreement
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Response SLA</TableHead>
                  <TableHead>Resolution SLA</TableHead>
                  <TableHead>Credit Rate</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell>
                      <span className="font-medium">{agreement.customer_name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(agreement.response_sla_minutes)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(agreement.resolution_sla_minutes)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Percent className="h-3 w-3" />
                        {(agreement.service_credit_rate * 100).toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(agreement.monthly_service_fee)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agreement.is_active ? "default" : "secondary"}>
                        {agreement.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(agreement)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(agreement.id)}
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
