import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  useIncidentTemplates, 
  useIncidentPriorities, 
  useIncidentCategories, 
  useAssignableUsers,
  useCreateIncidentTemplate,
  useUpdateIncidentTemplate,
  useDeleteIncidentTemplate
} from "@/hooks/useIncidents";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  Copy,
  Eye
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  title_template: z.string().min(1, "Title template is required"),
  description_template: z.string().optional(),
  default_priority_id: z.string().optional(),
  default_category_id: z.string().optional(),
  auto_assign_to: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export function TemplateManagement() {
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  
  const { data: templates, isLoading } = useIncidentTemplates();
  const { data: priorities } = useIncidentPriorities();
  const { data: categories } = useIncidentCategories();
  const { data: users } = useAssignableUsers();

  const createTemplate = useCreateIncidentTemplate();
  const updateTemplate = useUpdateIncidentTemplate();
  const deleteTemplate = useDeleteIncidentTemplate();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      title_template: "",
      description_template: "",
      default_priority_id: "",
      default_category_id: "",
      auto_assign_to: "",
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    try {
      // Clean up empty optional fields
      const cleanedData = {
        name: data.name,
        title_template: data.title_template,
        description: data.description || undefined,
        description_template: data.description_template || undefined,
        default_priority_id: data.default_priority_id || undefined,
        default_category_id: data.default_category_id || undefined,
        auto_assign_to: data.auto_assign_to || undefined,
      };

      if (editingTemplate) {
        await updateTemplate.mutateAsync({ 
          id: editingTemplate.id, 
          updates: cleanedData 
        });
      } else {
        await createTemplate.mutateAsync(cleanedData);
      }
      
      setDialogOpen(false);
      form.reset();
      setEditingTemplate(null);
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      title_template: template.title_template,
      description_template: template.description_template || "",
      default_priority_id: template.default_priority_id || "",
      default_category_id: template.default_category_id || "",
      auto_assign_to: template.auto_assign_to || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      try {
        await deleteTemplate.mutateAsync(templateId);
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const handlePreview = (template: any) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleDuplicate = (template: any) => {
    form.reset({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      title_template: template.title_template,
      description_template: template.description_template || "",
      default_priority_id: template.default_priority_id || "",
      default_category_id: template.default_category_id || "",
      auto_assign_to: template.auto_assign_to || "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Management</h2>
          <p className="text-muted-foreground">
            Create reusable templates for common incident types
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            form.reset();
            setEditingTemplate(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate 
                  ? "Update the template details below" 
                  : "Create a new incident template for faster incident creation"
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Server Down, Bug Report, Feature Request" {...field} />
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
                          placeholder="Brief description of when to use this template..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title Template</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., [URGENT] Server {{server_name}} is down" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description Template</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="## Problem Description&#10;&#10;Describe the issue...&#10;&#10;## Steps to Reproduce&#10;1. &#10;2. &#10;3. &#10;&#10;## Expected Behavior&#10;&#10;## Actual Behavior&#10;&#10;## Additional Context"
                          className="resize-none"
                          rows={6}
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
                    name="default_priority_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Priority</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No default</SelectItem>
                            {priorities?.map((priority) => (
                              <SelectItem key={priority.id} value={priority.id}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full bg-${priority.color}-500`} />
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
                    name="default_category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No default</SelectItem>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
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
                  name="auto_assign_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto-assign to</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No auto-assignment</SelectItem>
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
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTemplate ? "Update" : "Create"} Template
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview how this template will appear when creating incidents
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Title Template</h4>
                <div className="p-3 bg-muted rounded border font-mono text-sm">
                  {previewTemplate.title_template}
                </div>
              </div>
              
              {previewTemplate.description_template && (
                <div>
                  <h4 className="font-medium mb-2">Description Template</h4>
                  <div className="p-3 bg-muted rounded border font-mono text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {previewTemplate.description_template}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {previewTemplate.default_priority && (
                  <div>
                    <h4 className="font-medium mb-2">Default Priority</h4>
                    <Badge variant="outline" className="gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${previewTemplate.default_priority.color}-500`} />
                      {previewTemplate.default_priority.name}
                    </Badge>
                  </div>
                )}
                
                {previewTemplate.default_category && (
                  <div>
                    <h4 className="font-medium mb-2">Default Category</h4>
                    <Badge variant="outline">
                      {previewTemplate.default_category.name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Incident Templates
          </CardTitle>
          <CardDescription>
            Manage templates for faster incident creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : !templates?.length ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates configured</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first incident template
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Defaults</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {template.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {template.title_template}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.default_priority && (
                          <Badge variant="outline" className="text-xs">
                            P: {template.default_priority.name}
                          </Badge>
                        )}
                        {template.default_category && (
                          <Badge variant="outline" className="text-xs">
                            C: {template.default_category.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
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