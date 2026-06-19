import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });
}

export function useUploadTaskAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${taskId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path instead of signed URL (signed URLs expire)
      // Create database record with the file path
      const { data, error: dbError } = await supabase
        .from("task_attachments")
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_url: fileName, // Store the path, not signed URL
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      toast({
        title: "File uploaded",
        description: "Attachment added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attachment }: { attachment: TaskAttachment }) => {
      // Extract file path from URL
      const url = new URL(attachment.file_url);
      const pathParts = url.pathname.split("/task-attachments/");
      const filePath = pathParts[1];

      // Delete from storage
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("task-attachments")
          .remove([decodeURIComponent(filePath)]);

        if (storageError) {
          console.warn("Storage deletion warning:", storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: (_, { attachment }) => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", attachment.task_id] });
      toast({
        title: "Attachment deleted",
        description: "File removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
