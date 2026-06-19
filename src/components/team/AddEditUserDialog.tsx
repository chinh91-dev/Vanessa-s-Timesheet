
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserWithRole } from "@/lib/user-service";
import { useAuth } from "@/context/AuthContext";

interface AddEditUserDialogProps {
  user?: UserWithRole | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: any) => void;
  onDeactivate?: (userId: string, reason: string) => void;
  isNewUser?: boolean;
}

// Define schema for existing users (no email/password required)
const userSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().min(1, "Full name is required"),
  role: z.enum(["employee", "admin", "manager", "sale_user", "sale_manager"]),
  organization: z.string().optional().nullable(),
  time_zone: z.string().optional().nullable(),
  employment_type: z.enum(["full-time", "part-time", "temporary", "casual", "fixed-term"]),
  employee_card_id: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  deactivated_at: z.string().optional().nullable(),
});

// Extended schema for new users (with email/password)
const newUserSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["employee", "admin", "manager", "sale_user", "sale_manager"]),
  organization: z.string().optional().nullable(),
  time_zone: z.string().optional().nullable(),
  employment_type: z.enum(["full-time", "part-time", "temporary", "casual", "fixed-term"]),
  employee_card_id: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
});

const AddEditUserDialog = ({
  user,
  isOpen,
  onClose,
  onSave,
  onDeactivate,
  isNewUser = false,
}: AddEditUserDialogProps) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const [deactivationReason, setDeactivationReason] = useState("");
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const schema = isNewUser ? newUserSchema : userSchema;
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isNewUser ? {
      full_name: "",
      email: "",
      password: "",
      role: "employee" as const,
      organization: "",
      time_zone: "",
      employment_type: "full-time" as const,
      employee_card_id: "",
      employee_id: "",
    } : {
      id: user?.id || "",
      full_name: user?.full_name || "",
      role: (user?.role as "employee" | "admin" | "manager" | "sale_user" | "sale_manager") || "employee",
      organization: user?.organization || "",
      time_zone: user?.time_zone || "",
      employment_type: (user?.employment_type as "full-time" | "part-time" | "temporary" | "casual" | "fixed-term") || "full-time",
      employee_card_id: user?.employee_card_id || "",
      employee_id: user?.employee_id || "",
      deactivated_at: user?.deactivated_at || "",
    }
  });

  React.useEffect(() => {
    if (isNewUser) {
      form.reset({
        full_name: "",
        email: "",
        password: "",
        role: "employee",
        organization: "",
        time_zone: "",
        employment_type: "full-time",
        employee_card_id: "",
        employee_id: "",
      });
    } else if (user) {
      form.reset({
        id: user.id,
        full_name: user.full_name || "",
        role: (user.role as "employee" | "admin" | "manager" | "sale_user" | "sale_manager") || "employee",
        organization: user.organization || "",
        time_zone: user.time_zone || "",
        employment_type: (user.employment_type as "full-time" | "part-time" | "temporary" | "casual" | "fixed-term") || "full-time",
        employee_card_id: user.employee_card_id || "",
        employee_id: user.employee_id || "",
        deactivated_at: user.deactivated_at || "",
      });
    }
  }, [user, isNewUser, form]);

  const onSubmit = (values: any) => {
    onSave(values);
  };

  const handleDeactivate = () => {
    if (!user?.id || !onDeactivate) return;
    onDeactivate(user.id, deactivationReason);
    setShowDeactivateConfirm(false);
    setDeactivationReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNewUser ? "Add Team Member" : "Edit Team Member"}
          </DialogTitle>
          <DialogDescription>
            {isNewUser
              ? "Create a new team member account with the details below."
              : "Update the team member account details below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="John Doe" 
                        disabled={!isNewUser}
                        className={!isNewUser ? "bg-muted" : ""}
                      />
                    </FormControl>
                    {!isNewUser && (
                      <p className="text-sm text-muted-foreground">
                        Full name cannot be changed after creation.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isNewUser && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {isNewUser && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Min. 6 characters"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="sale_user">Sales User</SelectItem>
                        <SelectItem value="sale_manager">Sales Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time (Permanent)</SelectItem>
                        <SelectItem value="part-time">Part-time (Permanent)</SelectItem>
                        <SelectItem value="fixed-term">Fixed Term (Permanent)</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employee_card_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Card ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="EMP001"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="EMP001"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time_zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Zone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time zone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                        <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                        <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Organization name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Termination Date Field - Admin Only */}
            {isAdmin && !isNewUser && (
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="deactivated_at"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Termination Date (Admin Only)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Select termination date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString())}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Admin Danger Zone */}
            {isAdmin && !isNewUser && user?.is_active && onDeactivate && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4 p-4 border border-orange-200 rounded-lg bg-orange-50/50">
                  <div className="flex items-center gap-2 text-orange-700">
                    <UserMinus className="h-4 w-4" />
                    <span className="font-medium">Danger Zone</span>
                  </div>
                  
                  {!showDeactivateConfirm ? (
                    <div className="space-y-2">
                      <p className="text-sm text-orange-600">
                        Deactivate this user to prevent access while preserving their data.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDeactivateConfirm(true)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Deactivate User
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-orange-700 font-medium">
                        Are you sure you want to deactivate {user.full_name || user.email}?
                      </p>
                      <Textarea
                        placeholder="Reason for deactivation (optional)"
                        value={deactivationReason}
                        onChange={(e) => setDeactivationReason(e.target.value)}
                        className="bg-white border-orange-200"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowDeactivateConfirm(false);
                            setDeactivationReason("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleDeactivate}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Confirm Deactivation
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isNewUser ? "Create Team Member" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditUserDialog;
