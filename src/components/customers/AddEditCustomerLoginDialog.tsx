import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { createCustomerLogin, updateCustomerLogin, CustomerLogin } from '@/lib/customer-login-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddEditCustomerLoginDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  companyId: string;
  existingLogin?: CustomerLogin | null;
  customerLogin?: CustomerLogin | null;
  onSubmit?: (data: any) => void;
  isInvitation?: boolean;
}

interface FormValues {
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  password?: string;
  confirmPassword?: string;
}

const AddEditCustomerLoginDialog: React.FC<AddEditCustomerLoginDialogProps> = ({
  isOpen,
  open,
  onClose,
  companyId,
  existingLogin,
  customerLogin,
  onSubmit,
  isInvitation = false,
}) => {
  const dialogOpen = isOpen ?? open ?? false;
  const editingLogin = existingLogin ?? customerLogin;
  const queryClient = useQueryClient();
  const isEditing = !!editingLogin;

  const form = useForm<FormValues>({
    defaultValues: {
      email: '',
      full_name: '',
      role: 'staff',
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingLogin) {
      form.reset({
        email: editingLogin.email,
        full_name: editingLogin.full_name || '',
        role: editingLogin.role || 'staff',
        is_active: editingLogin.is_active,
      });
    } else {
      form.reset({
        email: '',
        full_name: '',
        role: 'staff',
        is_active: true,
      });
    }
  }, [editingLogin, form, dialogOpen]);

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (isEditing && editingLogin) {
        return updateCustomerLogin({
          id: editingLogin.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
          company_id: companyId,
        });
      } else {
        return createCustomerLogin({
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
          company_id: companyId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-logins', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customerLogins', companyId] });
      toast({
        title: 'Success',
        description: `Customer login ${isEditing ? 'updated' : 'created'} successfully`,
      });
      onClose();
    },
    onError: (error: any) => {
      console.error('Error saving customer login:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} customer login`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (onSubmit) {
      onSubmit(data);
    } else {
      mutation.mutate(data);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Customer Login' : 
             isInvitation ? 'Invite Customer User' : 'Add Customer Login'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="user@company.com" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password fields only when sending an invitation */}
            {!isEditing && isInvitation && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  rules={{
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Set a temporary password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  rules={{
                    required: 'Please confirm the password',
                    validate: (val) => val === form.getValues('password') || 'Passwords do not match',
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Re-enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Account</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Allow this user to log in to the customer portal
                    </div>
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? isEditing
                    ? 'Updating...'
                    : isInvitation
                    ? 'Sending Invitation...'
                    : 'Creating...'
                  : isEditing
                  ? 'Update'
                  : isInvitation
                  ? 'Send Invitation'
                  : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { AddEditCustomerLoginDialog };
export default AddEditCustomerLoginDialog;