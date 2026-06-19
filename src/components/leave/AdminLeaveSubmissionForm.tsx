import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, FileText, X, Search, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  LeaveType,
  fetchLeaveTypes,
  calculateBusinessDays,
  uploadLeaveAttachment
} from "@/lib/leave-service";
import { LeaveApplicationService } from "@/lib/leave/application-service";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  employment_type: string | null;
}

const formSchema = z.object({
  employee_id: z.string().min(1, "Please select an employee"),
  leave_type_id: z.string().min(1, "Please select a leave type"),
  start_date: z.date({
    required_error: "Start date is required",
  }),
  end_date: z.date({
    required_error: "End date is required",
  }),
  reason: z.string().optional(),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be after or equal to start date",
  path: ["end_date"],
});

const AdminLeaveSubmissionForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [businessDays, setBusinessDays] = useState<number>(0);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch leave types
        const typesData = await fetchLeaveTypes();
        setLeaveTypes(typesData);

        // Fetch active employees with employment_type
        const { data: employeesData, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, employment_type")
          .eq("is_active", true)
          .order("full_name", { ascending: true });

        if (error) throw error;
        setEmployees(employeesData || []);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id, toast]);

  // Calculate business days when dates change
  useEffect(() => {
    const startDate = form.watch("start_date");
    const endDate = form.watch("end_date");

    if (startDate && endDate) {
      calculateBusinessDays(
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      ).then(setBusinessDays).catch(console.error);
    }
  }, [form.watch("start_date"), form.watch("end_date")]);

  // Update selected leave type when form value changes
  useEffect(() => {
    const leaveTypeId = form.watch("leave_type_id");
    const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
    setSelectedLeaveType(leaveType || null);
  }, [form.watch("leave_type_id"), leaveTypes]);

  // Filter leave types based on selected employee's employment type
  const selectedEmployeeId = form.watch("employee_id");
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  
  const availableLeaveTypes = useMemo(() => {
    if (!selectedEmployee) return leaveTypes;
    
    const isCasualOrTemp = selectedEmployee.employment_type === 'casual' || 
                           selectedEmployee.employment_type === 'temporary';
    
    if (isCasualOrTemp) {
      return leaveTypes.filter(type => type.name.toLowerCase() === 'unpaid leave');
    }
    
    return leaveTypes;
  }, [leaveTypes, selectedEmployee]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB",
          variant: "destructive"
        });
        return;
      }

      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed",
          variant: "destructive"
        });
        return;
      }

      setAttachmentFile(file);
    }
  };

  const removeFile = () => {
    setAttachmentFile(null);
    const fileInput = document.getElementById('admin-attachment-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      // Use the new createOnBehalfOf method
      const application = await LeaveApplicationService.createOnBehalfOf(
        values.employee_id,
        {
          leave_type_id: values.leave_type_id,
          start_date: format(values.start_date, "yyyy-MM-dd"),
          end_date: format(values.end_date, "yyyy-MM-dd"),
          reason: values.reason
        }
      );

      // Upload attachment if provided
      if (attachmentFile) {
        try {
          await uploadLeaveAttachment(application.id, attachmentFile);
        } catch (uploadError) {
          console.error("Error uploading attachment:", uploadError);
          toast({
            title: "Upload Warning",
            description: "Leave application approved but attachment upload failed.",
            variant: "destructive",
          });
        }
      }

      const selectedEmployee = employees.find(e => e.id === values.employee_id);
      
      toast({
        title: "Leave Submitted & Approved",
        description: `Leave for ${selectedEmployee?.full_name || 'employee'} (${businessDays} business days) has been approved and timesheet dates are locked.`,
      });

      // Reset form
      form.reset();
      setBusinessDays(0);
      setSelectedLeaveType(null);
      setAttachmentFile(null);

    } catch (error) {
      console.error("Error submitting leave application:", error);
      
      let errorMessage = "Failed to submit leave application. Please try again.";
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = `Error: ${errorObj.message}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Selector */}
          <FormField
            control={form.control}
            name="employee_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Employee</FormLabel>
                <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={employeeOpen}
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? employees.find((e) => e.id === field.value)?.full_name || "Select employee"
                          : "Select employee"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {employees.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.full_name || employee.email}
                              onSelect={() => {
                                form.setValue("employee_id", employee.id);
                                setEmployeeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === employee.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{employee.full_name || "No name"}</span>
                                <span className="text-sm text-muted-foreground">{employee.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select the employee you are submitting leave for
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedEmployee && (
            <Card className="p-4 bg-muted/50">
              <p className="text-sm font-medium">Submitting leave for:</p>
              <p className="text-lg font-semibold">{selectedEmployee.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="leave_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableLeaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex flex-col">
                            <span>{type.name}</span>
                            {type.description && (
                              <span className="text-sm text-muted-foreground">
                                {type.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
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
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick start date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
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
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick end date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {businessDays > 0 && (
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <div>
                  <h4 className="font-medium">Business Days</h4>
                  <div className="text-2xl font-bold">{businessDays} days</div>
                </div>
              </div>
            </Card>
          )}

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide details about the leave..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide any additional details about the leave
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Supporting Documentation Upload */}
          <div className="space-y-4">
            <Label htmlFor="admin-attachment-file">
              Supporting Documentation (Optional)
            </Label>
            
            <div className="flex items-center space-x-2">
              <input
                id="admin-attachment-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('admin-attachment-file')?.click()}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Document</span>
              </Button>
              
              {attachmentFile && (
                <div className="flex items-center space-x-2 bg-muted px-3 py-1 rounded">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{attachmentFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit & Approve Leave"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AdminLeaveSubmissionForm;
