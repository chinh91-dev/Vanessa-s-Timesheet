import React, { useState, useEffect, useRef } from 'react';
import { todayLocalYMD } from '@/lib/date-utils';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Loader2, Upload, X, FileText, Image, File, ExternalLink } from 'lucide-react';
import { createHRIncident, updateHRIncident, type HRIncident } from '@/lib/ohs-service';
import { supabaseOHS as supabase } from '@/integrations/supabase-ohs/client';
import { storageHelpers } from '@/lib/storage-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const hrIncidentSchema = z.object({
  // Incident Details
  incident_date: z.string().min(1, 'Date of incident is required'),
  incident_time: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  report_number: z.string().optional(),
  
  // Nature of Incident
  nature_workplace_injury: z.boolean().default(false),
  nature_harassment_discrimination: z.boolean().default(false),
  nature_policy_violation: z.boolean().default(false),
  nature_other: z.boolean().default(false),
  nature_other_details: z.string().optional(),
  
  // Description
  description: z.string().min(1, 'Description is required'),
  
  // Individuals Involved
  individuals_involved: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    contact: z.string().optional(),
  })).default([]),
  
  // Actions Taken
  immediate_actions: z.string().optional(),
  follow_up_actions: z.string().optional(),
  
  // Report Details
  prepared_by: z.string().min(1, 'Prepared by is required'),
  prepared_by_signature: z.string().optional(),
  date_reported: z.string().min(1, 'Date reported is required'),
});

type HRIncidentFormData = z.infer<typeof hrIncidentSchema>;

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface HRIncidentFormProps {
  incident?: HRIncident | null;
  open: boolean;
  onClose: () => void;
}

const MAX_FILES = 20;

const HRIncidentForm: React.FC<HRIncidentFormProps> = ({ incident, open, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Attachment state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<string | null>(null);

  const form = useForm<HRIncidentFormData>({
    resolver: zodResolver(hrIncidentSchema),
    defaultValues: incident ? {
      incident_date: incident.incident_date,
      incident_time: incident.incident_time || '',
      location: incident.location,
      report_number: incident.report_number || '',
      nature_workplace_injury: incident.nature_workplace_injury,
      nature_harassment_discrimination: incident.nature_harassment_discrimination,
      nature_policy_violation: incident.nature_policy_violation,
      nature_other: incident.nature_other,
      nature_other_details: incident.nature_other_details || '',
      description: incident.description,
      individuals_involved: incident.individuals_involved || [],
      immediate_actions: incident.immediate_actions || '',
      follow_up_actions: incident.follow_up_actions || '',
      prepared_by: incident.prepared_by,
      prepared_by_signature: incident.prepared_by_signature || '',
      date_reported: incident.date_reported,
    } : {
      incident_date: todayLocalYMD(),
      incident_time: '',
      location: '',
      report_number: '',
      nature_workplace_injury: false,
      nature_harassment_discrimination: false,
      nature_policy_violation: false,
      nature_other: false,
      nature_other_details: '',
      description: '',
      individuals_involved: [{ name: '', contact: '' }],
      immediate_actions: '',
      follow_up_actions: '',
      prepared_by: '',
      prepared_by_signature: '',
      date_reported: todayLocalYMD(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'individuals_involved',
  });

  const watchNatureOther = form.watch('nature_other');

  // Load existing attachments when editing
  useEffect(() => {
    if (incident?.id) {
      loadExistingAttachments(incident.id);
    }
  }, [incident?.id]);

  const loadExistingAttachments = async (incidentId: string) => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('ohs_attachments')
        .select('*')
        .eq('entity_type', 'ohs_hr_incidents')
        .eq('entity_id', incidentId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setExistingAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const totalFiles = pendingFiles.length + existingAttachments.length + selectedFiles.length;
    
    if (totalFiles > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_FILES} files allowed.`,
        variant: "destructive",
      });
      return;
    }
    
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    // If editing an existing incident, upload immediately
    if (incident?.id && validFiles.length > 0) {
      setIsUploading(true);
      for (const file of validFiles) {
        const fileId = crypto.randomUUID();
        const fileName = `ohs_hr_incidents/${incident.id}/${fileId}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('ohs-attachments')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: "Upload failed", description: `Failed to upload ${file.name}`, variant: "destructive" });
          continue;
        }

        const { error: dbError } = await supabase
          .from('ohs_attachments')
          .insert([{
            entity_type: 'ohs_hr_incidents',
            entity_id: incident.id,
            file_name: file.name,
            file_url: fileName,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          }]);

        if (dbError) {
          console.error('DB insert error:', dbError);
          toast({ title: "Save failed", description: `Could not save record for ${file.name}`, variant: "destructive" });
        }
      }
      setIsUploading(false);
      await loadExistingAttachments(incident.id);
      toast({ title: "Upload complete", description: `${validFiles.length} file(s) uploaded successfully.` });
    } else {
      // New incident — defer upload until form submit
      setPendingFiles(prev => [...prev, ...validFiles]);
    }

    // Reset input so re-selecting the same file works
    event.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const confirmDeleteAttachment = (attachment: Attachment) => {
    setAttachmentToDelete(attachment);
    setDeleteDialogOpen(true);
  };

  const deleteAttachment = async () => {
    if (!attachmentToDelete) return;

    try {
      // file_url stores the raw path (not a signed URL)
      const filePath = attachmentToDelete.file_url;
      if (filePath) {
        await supabase.storage.from('ohs-attachments').remove([filePath]);
      }

      const { error } = await supabase
        .from('ohs_attachments')
        .delete()
        .eq('id', attachmentToDelete.id);

      if (error) throw error;

      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentToDelete.id));
      toast({ title: "File deleted", description: "The attachment has been removed." });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: "Delete failed", description: "Failed to delete the attachment.", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  const uploadPendingFiles = async (incidentId: string) => {
    console.log(`[HR Attachments] Starting upload of ${pendingFiles.length} files for incident ${incidentId}`);
    for (const file of pendingFiles) {
      const fileId = crypto.randomUUID();
      const fileName = `ohs_hr_incidents/${incidentId}/${fileId}-${file.name}`;
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      const { error: uploadError } = await supabase.storage
        .from('ohs-attachments')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

      // Store file path (not signed URL) — signed URLs expire
      const { error: dbError } = await supabase
        .from('ohs_attachments')
        .insert([{
          entity_type: 'ohs_hr_incidents',
          entity_id: incidentId,
          file_name: file.name,
          file_url: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        }]);

      if (dbError) {
        console.error('[HR Attachments] DB insert error:', dbError);
        toast({
          title: "Attachment record failed",
          description: `Could not save record for ${file.name}: ${dbError.message}`,
          variant: "destructive",
        });
      } else {
        console.log(`[HR Attachments] Successfully saved DB record for ${file.name}`);
      }

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
    }
    setPendingFiles([]);
    setUploadProgress({});
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalFiles = pendingFiles.length + existingAttachments.length;

  const onSubmit = async (data: HRIncidentFormData) => {
    setIsSubmitting(true);
    try {
      const filteredIndividuals = data.individuals_involved
        .filter(ind => ind.name.trim() !== '')
        .map(ind => ({ name: ind.name, contact: ind.contact || '' }));

      const payload = {
        ...data,
        individuals_involved: filteredIndividuals,
        created_by: user?.id,
        status: incident?.status || 'Open',
      };

      let incidentId: string;

      if (incident) {
        await updateHRIncident(incident.id, payload);
        incidentId = incident.id;
        
        // Upload any pending files
        if (pendingFiles.length > 0) {
          await uploadPendingFiles(incidentId);
          await loadExistingAttachments(incidentId);
        }
        
        toast({
          title: "HR Incident Updated",
          description: "The HR incident report has been successfully updated.",
        });
      } else {
        const newIncident = await createHRIncident(payload);
        incidentId = newIncident.id;
        
        // Upload pending files for new incident
        if (pendingFiles.length > 0) {
          await uploadPendingFiles(incidentId);
          await loadExistingAttachments(incidentId);
        }
        
        toast({
          title: "HR Incident Created",
          description: "The HR incident report has been successfully created.",
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving HR incident:', error);
      toast({
        title: "Error",
        description: "Failed to save HR incident report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-destructive/10 -mx-6 -mt-6 px-6 py-4 rounded-t-lg border-b border-destructive/20">
          <DialogTitle className="text-xl font-bold text-destructive">
            {incident ? 'Edit HR Incident Report' : 'HR Incident Report Form'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            {/* Incident Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Incident Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="incident_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Incident *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="incident_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time of Incident</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location of Incident *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Office Building A, Floor 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="report_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Report Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Auto-generated or enter manually" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Nature of Incident */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nature of Incident</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nature_workplace_injury"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Workplace Injury
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="nature_harassment_discrimination"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Harassment/Discrimination
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="nature_policy_violation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Policy Violation
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="nature_other"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Other
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {watchNatureOther && (
                  <FormField
                    control={form.control}
                    name="nature_other_details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Please specify other</FormLabel>
                        <FormControl>
                          <Input placeholder="Describe the nature of incident" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Description of Incident */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Description of Incident</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provide a detailed description of the incident *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what happened, including relevant details about the circumstances, events, and any contributing factors..."
                          className="min-h-32"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Individuals Involved */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Individuals Involved</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-4">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`individuals_involved.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Name {index === 0 && '*'}</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`individuals_involved.${index}.contact`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: '', contact: '' })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Person
                </Button>
              </CardContent>
            </Card>

            {/* Actions Taken */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions Taken</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="immediate_actions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Immediate Actions Taken</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe any immediate steps taken to address the incident..."
                          className="min-h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="follow_up_actions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-Up Actions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe planned follow-up actions or ongoing measures..."
                          className="min-h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Report Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Report Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prepared_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Prepared By *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="prepared_by_signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature</FormLabel>
                        <FormControl>
                          <Input placeholder="Type your name as signature" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="date_reported"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Date Reported *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Attachments</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {totalFiles}/{MAX_FILES} files
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <Label htmlFor="hr-form-file-upload" className="cursor-pointer">
                      <div className="text-sm font-medium mb-1">Drop files here or click to browse</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Images, PDF, Word, Excel (max 10MB each, up to {MAX_FILES} files)
                      </div>
                      <Button variant="outline" size="sm" type="button" disabled={isUploading} onClick={(e) => { e.stopPropagation(); document.getElementById('hr-form-file-upload')?.click(); }}>
                        {isUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Uploading...</> : 'Select Files'}
                      </Button>
                    </Label>
                    <Input
                      id="hr-form-file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      disabled={totalFiles >= MAX_FILES || isUploading}
                    />
                  </div>
                </div>

                {/* Pending Files */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Will upload on save ({pendingFiles.length})</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {pendingFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded bg-muted/50">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getFileIcon(file.type)}
                            <span className="truncate text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          
                          {isSubmitting && uploadProgress[file.name] !== undefined ? (
                            <div className="w-20">
                              <Progress value={uploadProgress[file.name]} className="h-2" />
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePendingFile(index)}
                              disabled={isSubmitting}
                              type="button"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Attachments */}
                {loadingAttachments ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading attachments...</span>
                  </div>
                ) : existingAttachments.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Uploaded Files ({existingAttachments.length})</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {existingAttachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getFileIcon(attachment.file_type)}
                            <span className="truncate text-sm">{attachment.file_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatFileSize(attachment.file_size)})
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setLoadingAttachmentId(attachment.id);
                                try {
                                  const signedUrl = await storageHelpers.ohsAttachments.getSignedUrl(attachment.file_url);
                                  if (signedUrl) {
                                    window.open(signedUrl, '_blank');
                                  } else {
                                    toast({ title: "Unable to access file", description: "Could not generate access link.", variant: "destructive" });
                                  }
                                } catch {
                                  toast({ title: "Error", description: "Failed to open attachment.", variant: "destructive" });
                                } finally {
                                  setLoadingAttachmentId(null);
                                }
                              }}
                              disabled={loadingAttachmentId === attachment.id}
                              type="button"
                            >
                              {loadingAttachmentId === attachment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeleteAttachment(attachment)}
                              className="text-destructive hover:text-destructive"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Separator />

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {incident ? 'Update Report' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{attachmentToDelete?.file_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAttachment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default HRIncidentForm;
