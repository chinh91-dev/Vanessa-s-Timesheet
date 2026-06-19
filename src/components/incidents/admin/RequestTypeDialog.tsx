import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCreatePortalRequestType,
  useUpdatePortalRequestType,
  PortalRequestType,
} from "@/hooks/usePortalRequestTypes";
import IconSelector from "./IconSelector";

const requestTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  icon: z.string().min(1, "Icon is required"),
  category: z.string().min(1, "Category is required"),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof requestTypeSchema>;

interface RequestTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingType: PortalRequestType | null;
}

export default function RequestTypeDialog({
  open,
  onOpenChange,
  editingType,
}: RequestTypeDialogProps) {
  const createRequestType = useCreatePortalRequestType();
  const updateRequestType = useUpdatePortalRequestType();

  const form = useForm<FormData>({
    resolver: zodResolver(requestTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "file-text",
      category: "Service requests",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingType) {
      form.reset({
        name: editingType.name,
        description: editingType.description || "",
        icon: editingType.icon,
        category: editingType.category,
        is_active: editingType.is_active,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        icon: "file-text",
        category: "Service requests",
        is_active: true,
      });
    }
  }, [editingType, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (editingType) {
        await updateRequestType.mutateAsync({
          id: editingType.id,
          ...data,
        });
      } else {
        await createRequestType.mutateAsync({
          name: data.name,
          description: data.description || null,
          icon: data.icon,
          category: data.category,
          is_active: data.is_active,
          sort_order: 0,
          form_schema: {
            fields: [
              { name: "summary", label: "Summary", type: "text", required: true },
              { name: "description", label: "Description", type: "richtext", required: false },
              { name: "attachment", label: "Attachment", type: "file", required: false },
            ],
          },
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingType ? "Edit Request Type" : "Create Request Type"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Request new hardware" {...field} />
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
                      placeholder="Describe what this request type is for..."
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Incidents">Incidents</SelectItem>
                      <SelectItem value="Service requests">Service requests</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon *</FormLabel>
                  <FormControl>
                    <IconSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Show this request type in the portal
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRequestType.isPending || updateRequestType.isPending}>
                {editingType ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
