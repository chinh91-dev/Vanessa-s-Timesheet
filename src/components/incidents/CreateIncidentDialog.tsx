import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Ticket, AlertTriangle, Zap, Shield, Monitor, Server, Database, Cloud, HelpCircle, Settings, ShoppingCart, User, Folder, FileText, Wrench, Mail, Phone, Globe, Lock, Key, Cpu, HardDrive, Wifi, Printer, Laptop, Smartphone } from "lucide-react";
import { useIncidentProjects, useIncidentPriorities, useIncidentCategories, useProjectMembers, useCreateIncident, useIncidentTemplates } from "@/hooks/useIncidents";
import { CreateIncidentRequest } from "@/types/incident-types";

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
const createIncidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority_id: z.string().optional(),
  category_id: z.string().optional(),
  incident_project_id: z.string().min(1, "Project is required"),
  assigned_to: z.string().optional(),
  impact_description: z.string().optional(),
  template_id: z.string().optional(),
});

type CreateIncidentFormData = z.infer<typeof createIncidentSchema>;

interface CreateIncidentDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultProjectId?: string;
}

export function CreateIncidentDialog({ 
  children, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  defaultProjectId 
}: CreateIncidentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  
  const { data: projects } = useIncidentProjects();
  const { data: priorities } = useIncidentPriorities();
  const { data: categories } = useIncidentCategories();
  const { data: templates } = useIncidentTemplates();
  const createIncident = useCreateIncident();

  const form = useForm<CreateIncidentFormData>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: "",
      description: "",
      priority_id: "",
      category_id: "",
      incident_project_id: defaultProjectId || "",
      assigned_to: "",
      impact_description: "",
      template_id: "",
    },
  });

  const selectedProjectId = form.watch("incident_project_id");
  const { data: projectMembers } = useProjectMembers(selectedProjectId || undefined);

  const onSubmit = async (data: CreateIncidentFormData) => {
    try {
      const incidentData: CreateIncidentRequest = {
        title: data.title,
        description: data.description,
        priority_id: data.priority_id || undefined,
        category_id: data.category_id || undefined,
        incident_project_id: data.incident_project_id,
        assigned_to: data.assigned_to || undefined,
        impact_description: data.impact_description,
        template_id: data.template_id || undefined,
      };

      await createIncident.mutateAsync(incidentData);
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error creating incident:", error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      form.setValue("title", template.title_template);
      form.setValue("description", template.description_template || "");
      if (template.default_priority_id) {
        form.setValue("priority_id", template.default_priority_id);
      }
      if (template.default_category_id) {
        form.setValue("category_id", template.default_category_id);
      }
      if (template.auto_assign_to) {
        form.setValue("assigned_to", template.auto_assign_to);
      }
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Create New Incident
            {defaultProjectId && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                in {projects?.find(p => p.id === defaultProjectId)?.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template (Optional)</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    handleTemplateChange(value);
                  }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!defaultProjectId && (
              <FormField
                control={form.control}
                name="incident_project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project) => (
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
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the incident" {...field} />
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
                      placeholder="Detailed description of the incident"
                      className="min-h-[100px]"
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee or use smart assignment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="smart_assignment">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <span>Smart Assignment</span>
                        </div>
                      </SelectItem>
                      {projectMembers?.filter(m => m.user_type === 'employee').map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
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
              name="impact_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impact Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the impact and affected systems/users"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            <Button type="submit" disabled={createIncident.isPending}>
              {createIncident.isPending ? "Creating..." : "Create Incident"}
            </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}