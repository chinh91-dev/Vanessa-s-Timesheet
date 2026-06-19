import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Image, File, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface HRIncidentAttachmentsProps {
  incidentId?: string;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  maxFiles?: number;
}

const HRIncidentAttachments: React.FC<HRIncidentAttachmentsProps> = ({
  incidentId,
  onAttachmentsChange,
  maxFiles = 20,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleViewAttachment = async (attachment: Attachment) => {
    setLoadingAttachmentId(attachment.id);
    try {
      const signedUrl = await storageHelpers.ohsAttachments.getSignedUrl(attachment.file_url);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        toast({
          title: "Unable to access file",
          description: "Could not generate access link for this attachment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error viewing attachment:", error);
      toast({
        title: "Error",
        description: "Failed to open attachment.",
        variant: "destructive",
      });
    } finally {
      setLoadingAttachmentId(null);
    }
  };

  // Load existing attachments when incidentId is provided
  useEffect(() => {
    if (incidentId) {
      loadExistingAttachments();
    }
  }, [incidentId]);

  const loadExistingAttachments = async () => {
    if (!incidentId) return;
    
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const totalFiles = files.length + existingAttachments.length + selectedFiles.length;
    
    if (totalFiles > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed. You have ${existingAttachments.length} existing + ${files.length} pending.`,
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
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/plain', 'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  }, [toast, files.length, existingAttachments.length, maxFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = async (targetIncidentId: string) => {
    if (files.length === 0) return [];

    setUploading(true);
    const uploadedResults: Attachment[] = [];

    try {
      for (const file of files) {
        const fileId = crypto.randomUUID();
        const fileName = `ohs_hr_incidents/${targetIncidentId}/${fileId}-${file.name}`;
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const { error: uploadError } = await supabase.storage
          .from('ohs-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        // Store file path instead of signed URL (signed URLs expire)
        const { data: attachmentData, error: dbError } = await supabase
          .from('ohs_attachments')
          .insert([{
           entity_type: 'ohs_hr_incidents',
            entity_id: targetIncidentId,
            file_name: file.name,
            file_url: fileName, // Store the path, not signed URL
            file_type: file.type,
            file_size: file.size,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          }])
          .select()
          .single();

        if (dbError) {
          throw new Error(`Failed to save attachment record: ${dbError.message}`);
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        uploadedResults.push({
          id: attachmentData.id,
          file_name: attachmentData.file_name,
          file_url: attachmentData.file_url,
          file_type: attachmentData.file_type,
          file_size: attachmentData.file_size,
        });
      }

      setFiles([]);
      setUploadProgress({});
      setExistingAttachments(prev => [...uploadedResults, ...prev]);
      onAttachmentsChange?.([...uploadedResults, ...existingAttachments]);
      
      toast({
        title: "Upload successful",
        description: `${uploadedResults.length} file(s) uploaded successfully`,
      });

      return uploadedResults;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
      return [];
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (attachment: Attachment) => {
    setAttachmentToDelete(attachment);
    setDeleteDialogOpen(true);
  };

  const deleteAttachment = async () => {
    if (!attachmentToDelete) return;

    try {
      // Delete from storage
      const filePath = attachmentToDelete.file_url.split('/ohs-attachments/')[1];
      if (filePath) {
        await supabase.storage
          .from('ohs-attachments')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('ohs_attachments')
        .delete()
        .eq('id', attachmentToDelete.id);

      if (error) throw error;

      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentToDelete.id));
      onAttachmentsChange?.(existingAttachments.filter(a => a.id !== attachmentToDelete.id));
      
      toast({
        title: "File deleted",
        description: "The attachment has been removed.",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the attachment.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalFiles = files.length + existingAttachments.length;

  // Expose upload function for parent form
  React.useImperativeHandle(
    React.useRef({ uploadFiles }),
    () => ({ uploadFiles }),
    [files]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Attachments</span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalFiles}/{maxFiles} files
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <Label htmlFor="hr-file-upload" className="cursor-pointer">
              <div className="text-sm font-medium mb-1">Drop files here or click to browse</div>
              <div className="text-xs text-muted-foreground mb-2">
                Images, PDF, Word, Excel (max 10MB each, up to {maxFiles} files)
              </div>
              <Button variant="outline" size="sm" type="button" onClick={(e) => { e.stopPropagation(); document.getElementById('hr-file-upload')?.click(); }}>
                Select Files
              </Button>
            </Label>
            <Input
              id="hr-file-upload"
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              disabled={totalFiles >= maxFiles}
            />
          </div>
        </div>

        {/* Pending Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Pending Upload ({files.length})</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded bg-muted/50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    <span className="truncate text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  
                  {uploading && uploadProgress[file.name] !== undefined ? (
                    <div className="w-20">
                      <Progress value={uploadProgress[file.name]} className="h-2" />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
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
        {loading ? (
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
                      onClick={() => handleViewAttachment(attachment)}
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
                      onClick={() => confirmDelete(attachment)}
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
      </CardContent>
    </Card>
  );
};

export default HRIncidentAttachments;

// Export a ref-based version for form integration
export const useHRIncidentAttachments = () => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const uploadPendingFiles = async (incidentId: string) => {
    if (pendingFiles.length === 0) return [];
    
    const uploadedResults: Attachment[] = [];
    
    for (const file of pendingFiles) {
      const fileId = crypto.randomUUID();
      const fileName = `ohs_hr_incidents/${incidentId}/${fileId}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ohs-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      // Store file path instead of signed URL (signed URLs expire)
      const { data: attachmentData, error: dbError } = await supabase
        .from('ohs_attachments')
        .insert([{
          entity_type: 'ohs_hr_incidents',
          entity_id: incidentId,
          file_name: file.name,
          file_url: fileName, // Store the path, not signed URL
          file_type: file.type,
          file_size: file.size,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (!dbError && attachmentData) {
        uploadedResults.push({
          id: attachmentData.id,
          file_name: attachmentData.file_name,
          file_url: attachmentData.file_url,
          file_type: attachmentData.file_type,
          file_size: attachmentData.file_size,
        });
      }
    }
    
    setPendingFiles([]);
    return uploadedResults;
  };

  return {
    pendingFiles,
    setPendingFiles,
    uploadPendingFiles,
  };
};
