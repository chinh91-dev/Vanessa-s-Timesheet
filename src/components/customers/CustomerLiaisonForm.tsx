import React from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CustomerLiaison } from "@/lib/customer-service";

interface LiaisonFormValues {
  name: string;
  title: string;
  email: string;
  phone: string;
}

interface CustomerLiaisonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LiaisonFormValues) => void;
  existingLiaison?: CustomerLiaison | null;
  isPending?: boolean;
}

const CustomerLiaisonForm: React.FC<CustomerLiaisonFormProps> = ({
  isOpen,
  onClose,
  onSave,
  existingLiaison,
  isPending = false,
}) => {
  const isEditing = !!existingLiaison;

  const form = useForm<LiaisonFormValues>({
    defaultValues: {
      name: existingLiaison?.name || "",
      title: existingLiaison?.title || "",
      email: existingLiaison?.email || "",
      phone: existingLiaison?.phone || "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: existingLiaison?.name || "",
        title: existingLiaison?.title || "",
        email: existingLiaison?.email || "",
        phone: existingLiaison?.phone || "",
      });
    }
  }, [isOpen, existingLiaison, form]);

  const handleSubmit = (data: LiaisonFormValues) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Liaison" : "Add Liaison"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter liaison name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. IT Manager, CFO" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="liaison@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="0412 345 678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEditing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerLiaisonForm;
