import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadLeaveAttachment } from "@/lib/leave-service";

interface DocumentUploadComponentProps {
  applicationId: string;
  isRequired?: boolean;
  leaveTypeName?: string;
}

const DocumentUploadComponent = ({ 
  applicationId, 
  isRequired = false, 
  leaveTypeName = "" 
}: DocumentUploadComponentProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadLeaveAttachment(applicationId, file);
      toast({
        title: "File Uploaded",
        description: "Your supporting document has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Upload className="h-4 w-4" />
        <span className="text-sm font-medium">
          {isRequired ? "Upload Required Supporting Documents" : "Upload Supporting Documentation (Optional)"}
        </span>
      </div>
      
      {!isRequired && (
        <p className="text-sm text-muted-foreground">
          You may optionally attach supporting documents such as medical certificates, travel confirmations, or other relevant documentation for your {leaveTypeName.toLowerCase()} leave.
        </p>
      )}
      
      <Input
        type="file"
        onChange={handleFileUpload}
        disabled={uploading}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="cursor-pointer"
      />
      
      <p className="text-xs text-muted-foreground">
        Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
      </p>
      
      {uploading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Uploading file...</p>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadComponent;