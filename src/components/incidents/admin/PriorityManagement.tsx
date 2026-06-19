import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useIncidentPriorities } from "@/hooks/useIncidents";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, AlertTriangle, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const prioritySchema = z.object({
  name: z.string().min(1, "Priority name is required"),
  color: z.string().min(1, "Color is required"),
  response_sla_minutes: z.number().min(1, "Response SLA must be at least 1 minute"),
  resolution_sla_minutes: z.number().min(1, "Resolution SLA must be at least 1 minute"),
  sort_order: z.number().min(0),
});
type PriorityFormData = z.infer<typeof prioritySchema>;

const colorOptions = [
  { value: "red", label: "Red", cls: "bg-red-500" },
  { value: "orange", label: "Orange", cls: "bg-orange-500" },
  { value: "yellow", label: "Yellow", cls: "bg-yellow-500" },
  { value: "green", label: "Green", cls: "bg-green-500" },
  { value: "blue", label: "Blue", cls: "bg-blue-500" },
  { value: "purple", label: "Purple", cls: "bg-purple-500" },
  { value: "gray", label: "Gray", cls: "bg-gray-500" },
];
const colorCls: Record<string, string> = Object.fromEntries(colorOptions.map(c => [c.value, c.cls]));

export function PriorityManagement() {
  const [editingPriority, setEditingPriority] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { data: priorities, isLoading } = useIncidentPriorities();

  const form = useForm<PriorityFormData>({
    resolver: zodResolver(prioritySchema),
    defaultValues: { name: "", color: "blue", response_sla_minutes: 240, resolution_sla_minutes: 1440, sort_order: 0 },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['incident-priorities'] });

  const onSubmit = async (data: PriorityFormData) => {
    setIsSaving(true);
    try {
      if (editingPriority) {
        const { error } = await supabase.from('incident_priorities').update(data).eq('id', editingPriority.id);
        if (error) throw error;
        toast.success("Priority updated");
      } else {
        const { error } = await supabase.from('incident_priorities').insert(data);
        if (error) throw error;
        toast.success("Priority created");
      }
      invalidate();
      setDialogOpen(false);
      form.reset();
      setEditingPriority(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save priority");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (priority: any) => {
    setEditingPriority(priority);
    form.reset({
      name: priority.name,
      color: priority.color || "blue",
      response_sla_minutes: priority.response_sla_minutes,
      resolution_sla_minutes: priority.resolution_sla_minutes,
      sort_order: priority.sort_order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this priority? This cannot be undone.")) return;
    const { error } = await supabase.from('incident_priorities').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success("Priority deleted");
    invalidate();
  };

  const fmt = (m: number) => {
    if (!m) return "—";
    const h = Math.floor(m / 60), r = m % 60;
    return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Priority Management</h2>
          <p className="text-muted-foreground">Configure incident priorities and their SLA requirements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { form.reset(); setEditingPriority(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Priority</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPriority ? "Edit Priority" : "Create Priority"}</DialogTitle>
              <DialogDescription>{editingPriority ? "Update priority settings" : "Create a new priority with SLA requirements"}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Priority Name</FormLabel><FormControl><Input placeholder="e.g., Critical, High, Medium, Low" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem><FormLabel>Color</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {colorOptions.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded-full ${c.cls}`} />{c.label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="response_sla_minutes" render={({ field }) => (
                    <FormItem><FormLabel>Response SLA (mins)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="resolution_sla_minutes" render={({ field }) => (
                    <FormItem><FormLabel>Resolution SLA (mins)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="sort_order" render={({ field }) => (
                  <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : editingPriority ? "Update Priority" : "Create Priority"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Incident Priorities</CardTitle>
          <CardDescription>Manage priority levels and their SLA requirements</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="text-center py-8">Loading priorities...</div>
            : !priorities?.length ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No priorities configured</h3>
                <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Priority</Button>
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Priority</TableHead><TableHead>Response SLA</TableHead><TableHead>Resolution SLA</TableHead><TableHead>Sort Order</TableHead><TableHead className="w-24">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {[...priorities].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colorCls[p.color || 'blue'] || 'bg-blue-500'}`} />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{fmt(p.response_sla_minutes)}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{fmt(p.resolution_sla_minutes)}</Badge></TableCell>
                      <TableCell>{p.sort_order ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
