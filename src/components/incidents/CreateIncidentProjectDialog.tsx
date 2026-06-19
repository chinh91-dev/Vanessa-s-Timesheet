import { useState } from "react";
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
  DialogTrigger,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateIncidentProject } from "@/hooks/useIncidents";
import { useAssignableUsers } from "@/hooks/useIncidents";
import CustomerSelector from "@/components/customers/CustomerSelector";
import TimesheetProjectSelector from "./TimesheetProjectSelector";
import TimesheetContractSelector from "./TimesheetContractSelector";
import { ProjectColorPicker } from "./ProjectColorPicker";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  lead_id: z.string().optional(),
  customer_id: z.string().optional(),
  timesheet_project_id: z.string().optional(),
  contract_id: z.string().optional(),
  project_key: z.string().min(1, "Project key is required").regex(/^[A-Z0-9-]+$/, "Project key must contain only uppercase letters, numbers, and hyphens"),
  icon_color: z.string().optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

interface CreateIncidentProjectDialogProps {
  children: React.ReactNode;
}

export function CreateIncidentProjectDialog({ children }: CreateIncidentProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const createProject = useCreateIncidentProject();
  const { data: users } = useAssignableUsers();

  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      lead_id: "",
      customer_id: "",
      timesheet_project_id: "",
      contract_id: "",
      project_key: "",
      icon_color: "#3b82f6",
    },
  });

  const { setValue } = form;

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      const projectData = {
        name: data.name,
        description: data.description,
        lead_id: data.lead_id || undefined,
        customer_id: data.customer_id || undefined,
        timesheet_project_id: data.timesheet_project_id || undefined,
        contract_id: data.contract_id || undefined,
        project_key: data.project_key,
        icon_color: data.icon_color || "#3b82f6",
      };
      
      await createProject.mutateAsync(projectData);
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Incident Project</DialogTitle>
          <DialogDescription>
            Create a new incident project with a custom project key.
          </DialogDescription>
        </DialogHeader>
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
                      selectedCustomerId={field.value || null}
                      onSelectCustomer={(id) => field.onChange(id || "")}
                      containerClassName=""
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

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}