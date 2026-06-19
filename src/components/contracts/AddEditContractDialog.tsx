
import React, { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { CalendarIcon, Loader2, FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Contract, saveContract, updateContract, fetchServices, removeContractFile } from "@/lib/contract-service";
import CustomerSelector from "../customers/CustomerSelector";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface AddEditContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingContract: Contract | null;
}

const formSchema = z.object({
  name: z.string().min(1, "Contract name is required"),
  description: z.string().optional(),
  customer_id: z.string().nullable().optional(),
  start_date: z.date(),
  end_date: z.date(),
  status: z.enum(['active', 'expired', 'pending_renewal', 'renewed']).default('active'),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const AddEditContractDialog: React.FC<AddEditContractDialogProps> = ({
  isOpen,
  onClose,
  existingContract,
}) => {
  const queryClient = useQueryClient();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [originalServiceIds, setOriginalServiceIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileMarkedForDeletion, setFileMarkedForDeletion] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Allowed file types for contract documents
  const ALLOWED_FILE_TYPES = [
    'application/pdf', // PDF
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  ];
  
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Fetch available services
  const { data: services = [], isLoading: isServicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
    enabled: isOpen,
  });
  
  // Initialize the form with default values or existing contract values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      customer_id: null,
      start_date: new Date(),
      end_date: addDays(new Date(), 365), // Default to 1 year
      status: 'active',
      is_active: true,
    },
  });

  // When the dialog opens or existingContract changes, set form values
  useEffect(() => {
    console.log("Dialog state changed - isOpen:", isOpen, "existingContract:", existingContract?.name);
    
    if (existingContract && isOpen) {
      const formValues = {
        name: existingContract.name,
        description: existingContract.description || "",
        customer_id: existingContract.customer_id || null,
        start_date: existingContract.start_date ? new Date(existingContract.start_date) : new Date(),
        end_date: existingContract.end_date ? new Date(existingContract.end_date) : addDays(new Date(), 365),
        status: existingContract.status || 'active',
        is_active: existingContract.is_active !== false,
      };
      
      console.log("Setting form values for existing contract:", formValues);
      form.reset(formValues);
      
      // Set selected services if the contract has any
      const serviceIds = existingContract.services?.map(service => service.id) || [];
      console.log("Setting service IDs:", serviceIds);
      setSelectedServiceIds(serviceIds);
      setOriginalServiceIds([...serviceIds]); // Create a copy
      
      // Clear any selected file when opening dialog
      setSelectedFile(null);
      setFileError(null);
      setUploadProgress(0);
    } else if (isOpen) {
      // Reset form for a new contract
      console.log("Setting default values for new contract");
      const defaultValues = {
        name: "",
        description: "",
        customer_id: null,
        start_date: new Date(),
        end_date: addDays(new Date(), 365),
        status: 'active' as const,
        is_active: true,
      };
      
      form.reset(defaultValues);
      setSelectedServiceIds([]);
      setOriginalServiceIds([]);
      setSelectedFile(null);
      setFileError(null);
      setUploadProgress(0);
    }
  }, [existingContract, isOpen, form]);

  // Handle service checkbox toggle
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFileError("Only PDF or Word documents are allowed");
      setSelectedFile(null);
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds the limit (${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
  };
  
  // Handle file upload to Supabase storage
  const uploadFile = async (file: File, contractId: string) => {
    console.log('🔵 Starting file upload for contract:', contractId, 'file:', file.name);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create a unique file name to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${contractId}-${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;
      console.log('🔵 Generated file path:', filePath);
      
      // Upload the file to Supabase Storage
      console.log('🔵 Uploading to storage...');
      const { data, error } = await supabase.storage
        .from('contracts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('🔴 Storage upload error:', error);
        throw error;
      }
      
      console.log('🟢 Storage upload successful:', data);
      
      // Get signed URL (bucket is now private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('contracts')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (urlError) {
        console.error('Error creating signed URL:', urlError);
        throw urlError;
      }
      
      console.log('🔵 Signed URL obtained:', urlData.signedUrl);
      
      // Update the contract record with file information
      console.log('🔵 Updating contract record with file info...');
      const updateData = {
        file_id: data?.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: urlData.signedUrl,
        uploaded_at: new Date().toISOString()
      };
      console.log('🔵 Update data:', updateData);
      
      const { error: updateError } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contractId);
      
      if (updateError) {
        console.error('🔴 Contract update error:', updateError);
        throw updateError;
      }
      
      console.log('🟢 Contract updated successfully with file info');
      setUploadProgress(100);
      return true;
    } catch (error) {
      console.error('🔴 Error uploading file:', error);
      toast({
        title: "File upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };
  
  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save/Update contract mutation
  const saveContractMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const contractData = {
        name: data.name,
        description: data.description,
        customer_id: data.customer_id,
        status: data.status,
        start_date: format(data.start_date, "yyyy-MM-dd"),
        end_date: format(data.end_date, "yyyy-MM-dd"),
        is_active: data.is_active,
      };
      
      let savedContract: Contract;
      
      if (existingContract) {
        // Update existing contract
        console.log("Updating existing contract:", existingContract.id);
        savedContract = await updateContract(existingContract.id, contractData, selectedServiceIds);
      } else {
        // Create new contract
        console.log("Creating new contract");
        savedContract = await saveContract(contractData, selectedServiceIds);
      }
      
      // Handle file operations
      if (selectedFile) {
        // Upload new file
        const uploadSuccess = await uploadFile(selectedFile, savedContract.id);
        if (!uploadSuccess) {
          console.warn("Contract saved but file upload failed");
        }
      } else if (fileMarkedForDeletion && existingContract?.id) {
        // Delete existing file if marked for deletion
        try {
          await removeContractFile(existingContract.id);
          console.log("File deleted successfully during contract update");
        } catch (error) {
          console.error("Error deleting file during contract update:", error);
          // Don't fail the entire operation for file deletion issues
        }
      }
      
      return savedContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: existingContract ? "Contract updated" : "Contract created",
        description: existingContract
          ? "Your contract has been updated successfully."
          : "Your new contract has been created successfully.",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Error saving contract:", error);
      toast({
        title: "Error",
        description: `Failed to ${existingContract ? "update" : "create"} contract. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    if (values.end_date < values.start_date) {
      toast({
        title: "Invalid date range",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }
    
    saveContractMutation.mutate(values);
  };

  // Handle cancel - reset all state before closing
  const handleCancel = () => {
    console.log("Cancel button clicked");
    console.log("Current selectedServiceIds:", selectedServiceIds);
    console.log("Original selectedServiceIds:", originalServiceIds);
    
    // Reset form to original values
    if (existingContract) {
      const originalValues = {
        name: existingContract.name,
        description: existingContract.description || "",
        customer_id: existingContract.customer_id || null,
        start_date: existingContract.start_date ? new Date(existingContract.start_date) : new Date(),
        end_date: existingContract.end_date ? new Date(existingContract.end_date) : addDays(new Date(), 365),
        status: (existingContract.status || 'active') as 'active' | 'expired' | 'pending_renewal' | 'renewed',
        is_active: existingContract.is_active !== false,
      };
      console.log("Resetting form to original values:", originalValues);
      form.reset(originalValues);
    } else {
      // Reset to default values for new contract
      const defaultValues = {
        name: "",
        description: "",
        customer_id: null,
        start_date: new Date(),
        end_date: addDays(new Date(), 365),
        status: 'active' as const,
        is_active: true,
      };
      console.log("Resetting form to default values:", defaultValues);
      form.reset(defaultValues);
    }
    
    // Reset service selection to original state
    console.log("Resetting service selection to:", originalServiceIds);
    setSelectedServiceIds([...originalServiceIds]);
    
      // Clear file selection and reset deletion flag
      setSelectedFile(null);
      setFileMarkedForDeletion(false);
      setFileError(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    
    console.log("Closing dialog");
    // Close dialog
    onClose();
  };

  // Access the mutation's isPending state
  const isSaving = saveContractMutation.isPending;

  // Get file extension from file type
  const getFileExtension = (fileType: string) => {
    switch(fileType) {
      case 'application/pdf':
        return 'PDF';
      case 'application/msword':
        return 'DOC';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'DOCX';
      default:
        return 'Unknown';
    }
  };
  
  // Truncate file name for display
  const truncateFileName = (fileName: string, maxLength: number = 20) => {
    if (!fileName) return '';
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';
    return `${truncatedName}.${extension}`;
  };

  // Handle staged file deletion
  const handleDeleteFile = () => {
    if (selectedFile) {
      // Clear newly selected file immediately
      clearSelectedFile();
      toast({
        title: "File removed",
        description: "Selected file has been removed.",
      });
    } else if (existingContract?.file_name) {
      // Mark existing file for deletion (staged)
      setFileMarkedForDeletion(true);
      toast({
        title: "File marked for deletion",
        description: "File will be deleted when you update the contract.",
      });
    }
  };

  // Undo file deletion marking
  const handleUndoDeleteFile = () => {
    setFileMarkedForDeletion(false);
    toast({
      title: "Deletion cancelled",
      description: "File will not be deleted.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingContract ? "Edit Contract" : "Create New Contract"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contract name" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter contract description"
                      {...field}
                      value={field.value || ""}
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
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <CustomerSelector
                      selectedCustomerId={field.value}
                      onSelectCustomer={field.onChange}
                      preventClose={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
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
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
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
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
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
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Renewal notice will be shown 3 months before this date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                      <SelectItem value="renewed">Renewed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Status will automatically update based on the end date.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* File Upload Section */}
            <div className="space-y-2">
              <FormLabel>Contract Document</FormLabel>
              <div className="border rounded-md p-4">
                {!selectedFile && !existingContract?.file_name ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <FileText className="h-10 w-10 text-gray-400 mb-2" />
                      <div className="text-sm text-muted-foreground mb-2">
                        Upload a PDF or Word document (max 10MB)
                      </div>
                      
                      <label htmlFor="contract-file" className="cursor-pointer">
                        <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Select File</span>
                        </div>
                        <input
                          id="contract-file"
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                        />
                      </label>
                    </div>
                    {existingContract && (
                      <div className="text-center text-sm text-muted-foreground">
                        {existingContract.file_name ? 
                          <div className="p-2 border border-dashed rounded flex items-center justify-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Current file: {truncateFileName(existingContract.file_name)}</span>
                          </div> : 
                          <span>No document currently attached</span>
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`flex items-center justify-between p-2 border rounded ${
                    fileMarkedForDeletion ? 'bg-destructive/10 border-destructive/20' : 'bg-muted/30'
                  }`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className={`h-5 w-5 flex-shrink-0 ${
                        fileMarkedForDeletion ? 'text-muted-foreground' : ''
                      }`} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-sm font-medium truncate ${
                              fileMarkedForDeletion ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {selectedFile ? selectedFile.name : existingContract?.file_name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {selectedFile ? selectedFile.name : existingContract?.file_name}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Badge variant="outline" className={`ml-2 ${
                        fileMarkedForDeletion ? 'text-muted-foreground' : ''
                      }`}>
                        {selectedFile 
                          ? getFileExtension(selectedFile.type) 
                          : existingContract?.file_type && getFileExtension(existingContract.file_type)}
                      </Badge>
                      {fileMarkedForDeletion && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Will be deleted
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {fileMarkedForDeletion ? (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2" 
                          onClick={handleUndoDeleteFile}
                        >
                          Undo
                        </Button>
                      ) : (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0" 
                          onClick={handleDeleteFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {fileError && (
                  <div className="mt-2 text-sm text-destructive">{fileError}</div>
                )}
              </div>
              <FormDescription>
                Attach the contract document in PDF or Word format
              </FormDescription>
            </div>

            <div>
              <FormLabel>Services</FormLabel>
              <div className="mt-2 border rounded-md p-4 max-h-48 overflow-y-auto">
                {isServicesLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {services.map(service => (
                      <div key={service.id} className="flex items-start space-x-2">
                        <Checkbox 
                          id={`service-${service.id}`}
                          checked={selectedServiceIds.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`service-${service.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {service.name}
                          </label>
                          {service.description && (
                            <p className="text-xs text-muted-foreground">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No services available
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedServiceIds.length > 0 && services.length > 0 && (
                  <div className="text-sm text-muted-foreground">Selected:</div>
                )}
                {services
                  .filter(service => selectedServiceIds.includes(service.id))
                  .map(service => (
                    <Badge key={service.id} variant="secondary" className="text-xs">
                      {service.name}
                    </Badge>
                  ))
                }
              </div>
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Contract</FormLabel>
                    <FormDescription>
                      Mark this contract as active and make it available for time entries.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saveContractMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveContractMutation.isPending}
              >
                {(saveContractMutation.isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingContract ? "Update Contract" : "Create Contract"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditContractDialog;
