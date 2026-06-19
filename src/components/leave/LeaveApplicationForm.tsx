import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, AlertCircle, FileText, X, Info } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useEmploymentType } from "@/hooks/useEmploymentType";
import DocumentUploadComponent from "./DocumentUploadComponent";

const formSchema = z.object({
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

const LeaveApplicationForm = () => {
  const { user } = useAuth();
  const { isCasualOrTemp } = useEmploymentType();
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [businessDays, setBusinessDays] = useState<number>(0);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        let typesData = await fetchLeaveTypes();
        
        // For casual/temporary employees, only show Unpaid Leave
        if (isCasualOrTemp) {
          typesData = typesData.filter(type => 
            type.name.toLowerCase() === 'unpaid leave'
          );
        }
        
        setLeaveTypes(typesData);
      } catch (error) {
        console.error("Error loading leave data:", error);
        toast({
          title: "Error",
          description: "Failed to load leave data. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id, isCasualOrTemp, toast]);

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

  const getLeaveBalance = (leaveTypeId: string) => {
    // Balance functionality removed - always return null
    return null;
  };

  const validateLeaveBalance = (leaveTypeId: string, requestedDays: number) => {
    // Balance validation removed - always allow
    return { valid: true, message: "" };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB",
          variant: "destructive"
        });
        return;
      }

      // Check file type
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
    const fileInput = document.getElementById('attachment-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const application = await LeaveApplicationService.create({
        leave_type_id: values.leave_type_id,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        reason: values.reason
      });

      setApplicationId(application.id);
      
      // Upload attachment if provided
      if (attachmentFile) {
        try {
          await uploadLeaveAttachment(application.id, attachmentFile);
          toast({
            title: "Document Uploaded",
            description: "Your supporting document has been uploaded successfully.",
          });
        } catch (uploadError) {
          console.error("Error uploading attachment:", uploadError);
          toast({
            title: "Upload Warning",
            description: "Leave application submitted but attachment upload failed. You can try uploading again.",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Leave Application Submitted",
        description: `Your leave application for ${businessDays} business days has been submitted for approval.`,
      });

      // Reset form
      form.reset();
      setBusinessDays(0);
      setSelectedLeaveType(null);
      setAttachmentFile(null);

    } catch (error) {
      console.error("Error submitting leave application:", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      
      // Parse specific error types for better user feedback
      let errorMessage = "Failed to submit leave application. Please try again.";
      
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        
        // Handle specific Supabase errors
        if (errorObj.message) {
          if (errorObj.message.includes('user_id')) {
            errorMessage = "Authentication error. Please log out and log back in.";
          } else if (errorObj.message.includes('business_days_count')) {
            errorMessage = "Error calculating business days. Please check your selected dates.";
          } else if (errorObj.message.includes('violates row-level security')) {
            errorMessage = "Permission denied. Please contact your administrator.";
          } else if (errorObj.message.includes('constraint')) {
            errorMessage = "Data validation error. Please check all required fields.";
          } else {
            errorMessage = `Error: ${errorObj.message}`;
          }
        }
        
        // Handle network errors
        if (errorObj.code === 'PGRST301' || errorObj.code === 'PGRST116') {
          errorMessage = "Database connection error. Please try again.";
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

  const currentBalance = null; // Balance functionality removed
  const balanceValidation = { valid: true, message: "" }; // Always allow

  return (
    <div className="space-y-6">
      {isCasualOrTemp && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            As a casual/temporary employee, you can only apply for Unpaid Leave.
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      {leaveTypes.map((type) => (
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
                        disabled={(date) => date < new Date()}
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
                        disabled={(date) => date < new Date()}
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
                  <h4 className="font-medium">Business Days Requested</h4>
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
                <FormLabel>
                  Reason {selectedLeaveType?.requires_attachment && "(Required for this leave type)"}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide details about your leave request..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide any additional details about your leave request
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedLeaveType?.requires_attachment && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This leave type requires supporting documentation. You can upload files after submitting your application.
              </AlertDescription>
            </Alert>
          )}

          {!selectedLeaveType?.requires_attachment && applicationId && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                You can optionally upload supporting documentation for your leave application below.
              </AlertDescription>
            </Alert>
          )}

          {/* Supporting Documentation Upload */}
          <div className="space-y-4">
            <Label htmlFor="attachment-file">
              Supporting Documentation {selectedLeaveType?.requires_attachment ? "(Required)" : "(Optional)"}
            </Label>
            
            <div className="flex items-center space-x-2">
              <input
                id="attachment-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('attachment-file')?.click()}
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
              {selectedLeaveType?.requires_attachment 
                ? "This leave type requires supporting documentation. Please upload relevant documents such as medical certificates or official documents."
                : "You may optionally attach supporting documents such as medical certificates, travel confirmations, or other relevant documentation."
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || (selectedLeaveType?.requires_attachment && !attachmentFile)}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Leave Application"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default LeaveApplicationForm;