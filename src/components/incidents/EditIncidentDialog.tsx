import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useUpdateIncident, 
  useIncidentPriorities, 
  useIncidentCategories,
  useProjectMembers
} from "@/hooks/useIncidents";
import type { Incident } from "@/types/incident-types";
import { Badge } from "@/components/ui/badge";
import { Ticket, AlertTriangle, Zap, Shield, Monitor, Server, Database, Cloud, HelpCircle, Settings, ShoppingCart, User, Folder, FileText, Wrench, Mail, Phone, Globe, Lock, Key, Cpu, HardDrive, Wifi, Printer, Laptop, Smartphone } from "lucide-react";

// Icon mapping for categories
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Ticket': Ticket, 'AlertTriangle': AlertTriangle, 'Zap': Zap, 'Shield': Shield,
  'Monitor': Monitor, 'Server': Server, 'Database': Database, 'Cloud': Cloud,
  'HelpCircle': HelpCircle, 'Settings': Settings, 'ShoppingCart': ShoppingCart,
  'User': User, 'Folder': Folder, 'FileText': FileText, 'Wrench': Wrench,
  'Mail': Mail, 'Phone': Phone, 'Globe': Globe, 'Lock': Lock, 'Key': Key,
  'Cpu': Cpu, 'HardDrive': HardDrive, 'Wifi': Wifi, 'Printer': Printer,
  'Laptop': Laptop, 'Smartphone': Smartphone,
};

const getIcon = (iconName?: string) => iconMap[iconName || ''] || HelpCircle;

const editIncidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority_id: z.string().optional(),
  category_id: z.string().optional(),
  assigned_to: z.string().optional(),
  created_by: z.string().optional(),
  impact_description: z.string().optional(),
});

type EditIncidentFormData = z.infer<typeof editIncidentSchema>;

interface EditIncidentDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIncidentDialog({ incident, open, onOpenChange }: EditIncidentDialogProps) {
  const updateIncident = useUpdateIncident();
  const { data: priorities } = useIncidentPriorities();
  const { data: categories } = useIncidentCategories();
  const { data: projectMembers } = useProjectMembers(incident.incident_project_id);

  const form = useForm<EditIncidentFormData>({
    resolver: zodResolver(editIncidentSchema),
    defaultValues: {
      title: incident.title,
      description: incident.description || "",
      priority_id: incident.priority_id || "",
      category_id: incident.category_id || "",
      assigned_to: incident.assigned_to || "",
      created_by: incident.created_by || "",
      impact_description: incident.impact_description || "",
    },
  });

  // Group categories by their category field
  const groupedCategories = useMemo(() => {
    if (!categories) return {};
    return categories.reduce((acc, cat) => {
      const group = cat.category || 'Other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(cat);
      return acc;
    }, {} as Record<string, typeof categories>);
  }, [categories]);

  const onSubmit = async (data: EditIncidentFormData) => {
    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        updates: {
          title: data.title,
          description: data.description,
          priority_id: data.priority_id || undefined,
          category_id: data.category_id || undefined,
          assigned_to: data.assigned_to || undefined,
          created_by: data.created_by || undefined,
          impact_description: data.impact_description,
        }
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating incident:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Incident</DialogTitle>
          <DialogDescription>
            Update the incident details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter incident title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the incident..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No Priority</SelectItem>
                        {priorities?.map((priority) => (
                          <SelectItem key={priority.id} value={priority.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: priority.color }}
                              />
                              {priority.name}
                            </div>
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
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No Request Type</SelectItem>
                        {Object.entries(groupedCategories).map(([groupName, groupCats]) => (
                          <SelectGroup key={groupName}>
                            <SelectLabel>{groupName}</SelectLabel>
                            {groupCats.map((category) => {
                              const Icon = getIcon(category.icon);
                              return (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
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
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {projectMembers?.filter(m => m.user_type === 'employee').map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
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
                name="created_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporter</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reporter" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectMembers?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              {user.full_name || user.email}
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {user.user_type === 'customer' ? 'Customer' : 'Employee'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="impact_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impact Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the impact of this incident..."
                      className="resize-none"
                      rows={3}
                      {...field}
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateIncident.isPending}>
                {updateIncident.isPending ? "Updating..." : "Update Incident"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}