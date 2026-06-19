import { useState, useCallback, useRef } from "react";
import { Upload, X, Eye, FileText, Image, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskAttachments, useUploadTaskAttachment, useDeleteTaskAttachment, TaskAttachment } from "@/hooks/crm/useTaskAttachments";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { storageHelpers } from "@/lib/storage-utils";

interface TaskAttachmentUploadProps {
  taskId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.startsWith("image/")) return Image;
  if (fileType.includes("pdf") || fileType.includes("word") || fileType.includes("document")) return FileText;
  return File;
}

function isImageType(fileType: string | null): boolean {
  return !!fileType && fileType.startsWith("image/");
}

export function TaskAttachmentUpload({ taskId }: TaskAttachmentUploadProps) {
  const { data: attachments, isLoading } = useTaskAttachments(taskId);
  const uploadMutation = useUploadTaskAttachment();
  const deleteMutation = useDeleteTaskAttachment();
  const { toast } = useToast();
  
  const [isDragging, setIsDragging] = useState(false);
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleViewAttachment = async (attachment: TaskAttachment) => {
    setLoadingAttachmentId(attachment.id);
    try {
      const signedUrl = await storageHelpers.taskAttachments.getSignedUrl(attachment.file_url);
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

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `Maximum file size is 10MB. "${file.name}" is ${formatFileSize(file.size)}`,
        variant: "destructive",
      });
      return false;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `"${file.name}" is not a supported file type. Use images, PDF, or Word documents.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      if (validateFile(file)) {
        uploadMutation.mutate({ taskId, file });
      }
    });
  }, [taskId, uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = (attachment: TaskAttachment) => {
    deleteMutation.mutate({ attachment });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Upload className="h-4 w-4" />
        <span>Attachments (Proof of Completion)</span>
      </div>

      {/* Existing attachments */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments && attachments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            const isImage = isImageType(attachment.file_type);
            
            return (
              <div
                key={attachment.id}
                className="relative group border border-border rounded-lg overflow-hidden bg-muted/30"
              >
                {/* Preview area */}
                <div className="aspect-square flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                
                {/* File info */}
                <div className="p-2 bg-background border-t border-border">
                  <p className="text-xs font-medium truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Action buttons overlay */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleViewAttachment(attachment)}
                    disabled={loadingAttachmentId === attachment.id}
                  >
                    {loadingAttachmentId === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDelete(attachment)}
                    disabled={deleteMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground/70">
              Images, PDF, Word docs • Max 10MB each
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
