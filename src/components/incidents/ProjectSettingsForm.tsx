import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateIncidentProject, useAssignableUsers } from "@/hooks/useIncidents";
import type { IncidentProject } from "@/types/incident-types";
import CustomerSelector from "@/components/customers/CustomerSelector";
import TimesheetProjectSelector from "./TimesheetProjectSelector";
import TimesheetContractSelector from "./TimesheetContractSelector";
import { ProjectColorPicker } from "./ProjectColorPicker";
import { useToast } from "@/hooks/use-toast";
import { Copy, Mail, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const projectSettingsSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  lead_id: z.string().optional(),
  customer_id: z.string().optional(),
  timesheet_project_id: z.string().optional(),
  contract_id: z.string().optional(),
  project_key: z.string().min(1, "Project key is required").regex(/^[A-Z0-9-]+$/, "Project key must contain only uppercase letters, numbers, and hyphens"),
  icon_color: z.string().optional(),
  support_email_prefix: z.string().optional().refine(
    (val) => !val || /^[a-z0-9-]+$/.test(val),
    "Prefix must contain only lowercase letters, numbers, and hyphens"
  ),
});

type ProjectSettingsFormData = z.infer<typeof projectSettingsSchema>;

interface ProjectSettingsFormProps {
  project: IncidentProject;
  onSuccess?: () => void;
  showCancelButton?: boolean;
  onCancel?: () => void;
}

export function ProjectSettingsForm({ 
  project, 
  onSuccess, 
  showCancelButton = false,
  onCancel 
}: ProjectSettingsFormProps) {
  const { toast } = useToast();
  const updateProject = useUpdateIncidentProject();
  const { data: users } = useAssignableUsers();

  const form = useForm<ProjectSettingsFormData>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      lead_id: project.lead_id || "",
      customer_id: project.customer_id || "",
      timesheet_project_id: project.timesheet_project_id || "",
      contract_id: project.contract_id || "",
      project_key: project.project_key,
      icon_color: project.icon_color || "#3b82f6",
      support_email_prefix: project.support_email_prefix || "",
    },
  });

  const { setValue } = form;
  const watchedPrefix = form.watch("support_email_prefix");
  const fullEmailAddress = watchedPrefix ? `${watchedPrefix}@support.comansservices.com.au` : "";

  const copyEmailToClipboard = () => {
    if (fullEmailAddress) {
      navigator.clipboard.writeText(fullEmailAddress);
      toast({
        title: "Copied",
        description: "Email address copied to clipboard.",
      });
    }
  };

  const onSubmit = async (data: ProjectSettingsFormData) => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        updates: {
          name: data.name,
          description: data.description,
          lead_id: data.lead_id || undefined,
          customer_id: data.customer_id || undefined,
          timesheet_project_id: data.timesheet_project_id || undefined,
          contract_id: data.contract_id || undefined,
          project_key: data.project_key,
          icon_color: data.icon_color || "#3b82f6",
          support_email_prefix: data.support_email_prefix || undefined,
        }
      });
      toast({
        title: "Project updated",
        description: "Project settings have been saved successfully.",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "Failed to update project settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Web Development Team" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="project_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Key</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., WDT-1, PROJ-001" 
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
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
                  placeholder="Brief description of the project..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer (Optional)</FormLabel>
              <FormControl>
                <CustomerSelector
                  selectedCustomerId={field.value}
                  onSelectCustomer={field.onChange}
                  preventClose={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Timesheet Link (Optional — choose one)</p>
          <FormField
            control={form.control}
            name="timesheet_project_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Timesheet Project</FormLabel>
                <FormControl>
                  <TimesheetProjectSelector
                    selectedProjectId={field.value}
                    onSelectProject={(id) => {
                      field.onChange(id ?? "");
                      if (id) setValue("contract_id", "");
                    }}
                    preventClose={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t" />
          </div>
          <FormField
            control={form.control}
            name="contract_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Contract</FormLabel>
                <FormControl>
                  <TimesheetContractSelector
                    selectedContractId={field.value}
                    onSelectContract={(id) => {
                      field.onChange(id ?? "");
                      if (id) setValue("timesheet_project_id", "");
                    }}
                    preventClose={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="lead_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Lead (Optional)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project lead" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">No Lead</SelectItem>
                  {users?.map((user) => (
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
          name="icon_color"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ProjectColorPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email-to-Ticket Configuration */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email-to-Ticket Configuration
            </CardTitle>
            <CardDescription>
              Allow customers to create tickets by sending emails to a unique address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="support_email_prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Email Prefix</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., support, helpdesk, csit" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                  </FormControl>
                  <FormDescription>
                    Letters, numbers, and hyphens only. Leave empty to disable email tickets.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fullEmailAddress && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Customers can email:</p>
                    <p className="font-mono text-sm font-medium truncate">{fullEmailAddress}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyEmailToClipboard}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Emails sent to this address will automatically create tickets in this project.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2 pt-4">
          {showCancelButton && onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={updateProject.isPending}>
            {updateProject.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
