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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import CustomerSelector from "@/components/customers/CustomerSelector";
import {
  useCreatePortalGroup,
  useUpdatePortalGroup,
  PortalGroup,
} from "@/hooks/usePortalGroups";

const portalGroupSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  name: z.string().min(1, "Name is required"),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof portalGroupSchema>;

interface PortalGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup: PortalGroup | null;
  defaultCustomerId?: string;
}

export default function PortalGroupDialog({
  open,
  onOpenChange,
  editingGroup,
  defaultCustomerId,
}: PortalGroupDialogProps) {
  const createGroup = useCreatePortalGroup();
  const updateGroup = useUpdatePortalGroup();

  const form = useForm<FormData>({
    resolver: zodResolver(portalGroupSchema),
    defaultValues: {
      customer_id: "",
      name: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingGroup) {
      form.reset({
        customer_id: editingGroup.customer_id || "",
        name: editingGroup.name,
        is_active: editingGroup.is_active,
      });
    } else {
      form.reset({
        customer_id: defaultCustomerId || "",
        name: "",
        is_active: true,
      });
    }
  }, [editingGroup, form, open, defaultCustomerId]);

  const onSubmit = async (data: FormData) => {
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          name: data.name,
          is_active: data.is_active,
          icon: editingGroup.icon,
        });
      } else {
        await createGroup.mutateAsync({
          name: data.name,
          description: null,
          icon: "folder",
          is_active: data.is_active,
          customer_id: data.customer_id,
          sort_order: 0,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isEditing = !!editingGroup;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingGroup ? "Edit Portal Group" : "Create Portal Group"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer selector - only shown when creating and no default customer */}
            {!isEditing && !defaultCustomerId && (
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
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
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., General IT Assistance" {...field} />
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
                      Show this group in the customer portal
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
              <Button type="submit" disabled={createGroup.isPending || updateGroup.isPending}>
                {editingGroup ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
