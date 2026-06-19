import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
}

interface CommentAttachmentUploaderProps {
  attachments: PendingAttachment[];
  onAttachmentsChange: (attachments: PendingAttachment[]) => void;
  disabled?: boolean;
  maxFileSize?: number; // in bytes, default 10MB
  maxFiles?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export function CommentAttachmentUploader({
  attachments,
  onAttachmentsChange,
  disabled = false,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = 5
}: CommentAttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || disabled) return;

    const newAttachments: PendingAttachment[] = [];
    
    Array.from(files).forEach(file => {
      // Check max files
      if (attachments.length + newAttachments.length >= maxFiles) {
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds the ${maxFileSize / 1024 / 1024}MB limit.`,
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `"${file.name}" (${file.type || 'unknown type'}) is not allowed. Use images, PDFs, Word docs or text files.`,
          variant: "destructive",
        });
        return;
      }

      const attachment: PendingAttachment = {
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      };
      newAttachments.push(attachment);
    });

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      const dataTransfer = new DataTransfer();
      files.forEach(f => dataTransfer.items.add(f));
      handleFileSelect(dataTransfer.files);
    }
  };

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className="space-y-2">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className={cn(
                "relative group flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5",
                isImage(attachment.file) && attachment.preview && "p-1"
              )}
            >
              {isImage(attachment.file) && attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="h-12 w-12 object-cover rounded"
                />
              ) : (
                <>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm max-w-[150px] truncate">{attachment.file.name}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => handleRemove(attachment.id)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={disabled}
      />

      {/* Attach button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || attachments.length >= maxFiles}
        className="gap-2"
      >
        <Paperclip className="h-4 w-4" />
        Attach
      </Button>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {attachments.length}/{maxFiles} files. Max {maxFileSize / 1024 / 1024}MB each. Paste images directly.
      </p>
    </div>
  );
}

// Export the paste handler for use in textarea
export function useCommentPasteHandler(
  onPaste: (files: File[]) => void,
  disabled: boolean = false
) {
  return (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      onPaste(files);
    }
  };
}
