import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabaseOHS as supabase } from '@/integrations/supabase-ohs/client';

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: 'hazard' | 'inspection' | 'injury' | 'hr_incident';
  entityId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  open,
  onClose,
  entityType,
  entityId,
  onUploadComplete,
  maxFiles = 20,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Validate files
    const validFiles = selectedFiles.filter(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const uploadedResults: UploadedFile[] = [];

    try {
      for (const file of files) {
        const fileId = crypto.randomUUID();
        const fileName = `${entityType}/${entityId}/${fileId}-${file.name}`;
        
        // Update progress for this file
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ohs-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        // Store file path instead of signed URL (signed URLs expire)
        // Save attachment record to database with file path
        const { data: attachmentData, error: dbError } = await supabase
          .from('ohs_attachments')
          .insert([{
            entity_type: entityType,
            entity_id: entityId,
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

        // Complete progress for this file
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        uploadedResults.push({
          id: attachmentData.id,
          file_name: attachmentData.file_name,
          file_url: attachmentData.file_url,
          file_type: attachmentData.file_type,
          file_size: attachmentData.file_size,
        });
      }

      setUploadedFiles(uploadedResults);
      onUploadComplete?.(uploadedResults);
      
      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded successfully`,
      });

      // Clear files after successful upload
      setFiles([]);
      setUploadProgress({});

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Attachments</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-lg font-medium mb-2">Drop files here or click to browse</div>
                <div className="text-sm text-muted-foreground mb-4">
                  Supported: Images, PDF, Word documents, Text files (max 10MB each)
                </div>
                <Button variant="outline" type="button" onClick={(e) => { e.stopPropagation(); document.getElementById('file-upload')?.click(); }}>
                  Select Files
                </Button>
              </Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.csv"
              />
            </div>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Selected Files ({files.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
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
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                Uploading files... Please wait.
              </AlertDescription>
            </Alert>
          )}

          {/* Previously Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Successfully Uploaded</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    {getFileIcon(file.file_type)}
                    <span className="truncate text-sm">{file.file_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(file.file_size)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Close
            </Button>
            <Button 
              onClick={uploadFiles} 
              disabled={files.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;