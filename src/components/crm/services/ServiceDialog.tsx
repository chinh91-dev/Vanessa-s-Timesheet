import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useCreateService, useUpdateService } from "@/hooks/crm/useServices";
import { useServiceCategories } from "@/hooks/crm/useServiceCategories";
import { BILLING_TYPES } from "@/lib/crm/constants";
import type { Service } from "@/lib/crm/types";
import { Trash2 } from "lucide-react";

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().max(50).optional(),
  category: z.string().max(50).optional().nullable(),
  billing_types: z.array(z.enum(["monthly", "one_off", "t_and_m"])).default([]),
  is_active: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceDialogProps {
  open: boolean;
  onClose: () => void;
  service?: Service;
  onDelete?: () => void;
}

export function ServiceDialog({ open, onClose, service, onDelete }: ServiceDialogProps) {
  const createService = useCreateService();
  const updateService = useUpdateService();
  const { data: categories, isLoading: categoriesLoading } = useServiceCategories();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || "",
      sku: service?.sku || "",
      category: service?.category || "",
      billing_types: (service?.billing_types as any) || [],
      is_active: service?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (open && service) {
      form.reset({
        name: service.name || "",
        sku: service.sku || "",
        category: service.category || "",
        billing_types: (service.billing_types as any) || [],
        is_active: service.is_active ?? true,
      });
    } else if (open && !service) {
      form.reset({
        name: "",
        sku: "",
        category: "",
        billing_types: [],
        is_active: true,
      });
    }
  }, [open, service, form]);

  const onSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    try {
      // Convert empty string to null for category
      const submitData = {
        ...data,
        category: data.category || null,
      };
      
      if (service) {
        await updateService.mutateAsync({ id: service.id, updates: submitData as any });
      } else {
        await createService.mutateAsync(submitData as any);
      }
      onClose();
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find the color for the selected category
  const selectedCategoryColor = categories?.find(
    c => c.name === form.watch("category")
  )?.color;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Create Service"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Cloud Infrastructure Support" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. SVC-001" />
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
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category">
                          {field.value && (
                            <div className="flex items-center gap-2">
                              {selectedCategoryColor && (
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: selectedCategoryColor }}
                                />
                              )}
                              <span>{field.value}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">No category</span>
                      </SelectItem>
                      {categoriesLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading categories...
                        </SelectItem>
                      ) : categories?.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          No categories available
                        </SelectItem>
                      ) : (
                        categories?.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: category.color || '#6366f1' }}
                              />
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Types</FormLabel>
                  <FormDescription>Select all applicable billing types</FormDescription>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {Object.entries(BILLING_TYPES).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`billing-${value}`}
                          checked={field.value?.includes(value as any)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            field.onChange(
                              checked
                                ? [...current, value]
                                : current.filter((v) => v !== value)
                            );
                          }}
                        />
                        <label 
                          htmlFor={`billing-${value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Make this service available for selection
                    </FormDescription>
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

            <div className="flex justify-between gap-2 pt-4">
              {service && onDelete && (
                <Button type="button" variant="destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : service ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
