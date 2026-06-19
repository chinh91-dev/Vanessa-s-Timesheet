import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useIncidentRealtime } from '@/hooks/useIncidentRealtime';
import { useIncidentCommentRealtime } from '@/hooks/useIncidentCommentRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, AlertCircle, CheckCircle2, User, Calendar, Tag, Loader2, Send, Paperclip, X, FileText, Download, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { IncidentService } from '@/lib/incident-service';
import { toast } from 'sonner';
import type { CommentAttachment, IncidentStatus } from '@/types/incident-types';
import { INCIDENT_STATUS_FLOW } from '@/types/incident-types';
import { storageHelpers } from '@/lib/storage-utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'New': { label: 'New', color: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="h-4 w-4" /> },
  'Triaged': { label: 'Triaged', color: 'bg-purple-100 text-purple-800', icon: <Clock className="h-4 w-4" /> },
  'In Progress': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" /> },
  'Resolved': { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-4 w-4" /> },
  'Closed': { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: <CheckCircle2 className="h-4 w-4" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'bg-red-100 text-red-800 border-red-200',
  'High': 'bg-orange-100 text-orange-800 border-orange-200',
  'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Low': 'bg-green-100 text-green-800 border-green-200',
};

interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

function CustomerAttachmentView({ attachment }: { attachment: CommentAttachment }) {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'success' | 'error'>('loading');
  const isImg = attachment.file_type?.startsWith('image/');

  React.useEffect(() => {
    setLoadState('loading');
    storageHelpers.commentAttachments.getSignedUrl(attachment.file_url)
      .then(url => { if (url) { setSignedUrl(url); setLoadState('success'); } else { setLoadState('error'); } })
      .catch(() => setLoadState('error'));
  }, [attachment.file_url]);

  if (loadState === 'loading') {
    return <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-sm">{attachment.file_name}</span></div>;
  }
  if (loadState === 'error') {
    return <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{attachment.file_name}</span><span className="text-xs text-destructive">(unavailable)</span></div>;
  }
  if (isImg) {
    return <a href={signedUrl!} target="_blank" rel="noopener noreferrer"><img src={signedUrl!} alt={attachment.file_name} className="max-h-40 rounded-md border cursor-pointer hover:opacity-90 transition-opacity" /></a>;
  }
  return <a href={signedUrl!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 hover:bg-muted transition-colors"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{attachment.file_name}</span><Download className="h-4 w-4 text-muted-foreground" /></a>;
}

export default function CustomerTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useCustomerAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | "">("");
  const [statusComment, setStatusComment] = useState("");

  // Enable real-time updates for incidents and comments
  useIncidentRealtime();
  useIncidentCommentRealtime(id);

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ['customer-incident', id],
    queryFn: async () => {
      if (!id || !user?.user_id) return null;
      
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          priority:incident_priorities(id, name, color),
          category:incident_categories(id, name),
          incident_project:incident_projects(id, name, project_key)
        `)
        .eq('id', id)
        .eq('created_by', user.user_id)
        .single();
      
      if (error) throw error;

      // Fetch creator name using RPC function that bypasses RLS
      let creatorName = 'Unknown';
      if (data?.created_by) {
        const { data: creatorData } = await supabase.rpc('get_user_display_name', { 
          p_user_id: data.created_by 
        });
        
        if (creatorData && creatorData[0]) {
          creatorName = creatorData[0].full_name || creatorData[0].email || 'Unknown';
        }
      }

      // Fetch assignee name using RPC function that bypasses RLS
      let assigneeName = null;
      if (data?.assigned_to) {
        const { data: assigneeData } = await supabase.rpc('get_user_display_name', { 
          p_user_id: data.assigned_to 
        });
        
        if (assigneeData && assigneeData[0]) {
          assigneeName = assigneeData[0].full_name || assigneeData[0].email || 'Unassigned';
        }
      }

      return { ...data, creator_name: creatorName, assignee_name: assigneeName };
    },
    enabled: !!id && !!user?.user_id,
  });

  const { data: comments } = useQuery({
    queryKey: ['customer-incident-comments', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('incident_comments')
        .select('*')
        .eq('incident_id', id)
        .eq('is_internal', false) // Only show public comments to customers
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch author names using RPC function that bypasses RLS
      const authorIds = [...new Set(data.map(c => c.create_by).filter(Boolean))];
      const authorResults = await Promise.all(
        authorIds.map(id => supabase.rpc('get_user_display_name', { p_user_id: id }))
      );

      const authorMap = new Map<string, string>();
      authorResults.forEach((result, index) => {
        if (result.data && result.data[0]) {
          const user = result.data[0];
          authorMap.set(authorIds[index], user.full_name || user.email || 'Unknown');
        }
      });

      return data.map(comment => ({
        ...comment,
        author_name: authorMap.get(comment.create_by) || 'Unknown'
      }));
    },
    enabled: !!id,
  });

  // Upload files to storage and return attachment metadata
  const uploadAttachments = async (): Promise<CommentAttachment[]> => {
    if (pendingAttachments.length === 0) return [];

    const uploadedAttachments: CommentAttachment[] = [];

    let failedCount = 0;

    for (const attachment of pendingAttachments) {
      const fileExt = attachment.file.name.split('.').pop();
      const fileName = `${user?.user_id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('comment-attachments')
        .upload(fileName, attachment.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        failedCount++;
        toast.error(`Failed to upload "${attachment.file.name}"`);
        continue;
      }

      uploadedAttachments.push({
        id: crypto.randomUUID(),
        file_name: attachment.file.name,
        file_url: fileName,
        file_type: attachment.file.type,
        file_size: attachment.file.size
      });
    }

    if (failedCount > 0 && uploadedAttachments.length > 0) {
      toast.error(`${failedCount} of ${pendingAttachments.length} files failed to upload`);
    }

    return uploadedAttachments;
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ newStatus, comment }: { newStatus: IncidentStatus; comment: string }) => {
      await IncidentService.updateIncidentStatus(id!, newStatus);
      if (comment.trim()) {
        await IncidentService.addComment({
          incident_id: id!,
          content: comment.trim(),
          is_internal: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-incident', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-incident-comments', id] });
      setStatusDialogOpen(false);
      setSelectedStatus("");
      setStatusComment("");
      toast.success("Ticket status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      // Upload attachments first
      const attachments = await uploadAttachments();

      // Block submit if user only attached files and all uploads failed
      if (!content.trim() && pendingAttachments.length > 0 && attachments.length === 0) {
        throw new Error('All file uploads failed. Please try again.');
      }

      return IncidentService.addComment({
        incident_id: id!,
        content: content || '(attachment)',
        is_internal: false, // Customers can only add public comments
        attachments: attachments.length > 0 ? attachments : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-incident-comments', id] });
      setNewComment("");
      // Clean up previews
      pendingAttachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setPendingAttachments([]);
      toast.success("Comment added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add comment");
      console.error(error);
    }
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newAttachments: PendingAttachment[] = [];
    
    Array.from(files).forEach(file => {
      if (pendingAttachments.length + newAttachments.length >= MAX_FILES) return;
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} exceeds 10MB limit`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`File type not allowed: ${file.type}`);
        return;
      }

      newAttachments.push({
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
    });

    if (newAttachments.length > 0) {
      setPendingAttachments(prev => [...prev, ...newAttachments]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      files.forEach(f => dataTransfer.items.add(f));
      handleFileSelect(dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => {
    const attachment = pendingAttachments.find(a => a.id === id);
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  const isImage = (type: string) => type.startsWith('image/');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/customer-portal/my-tickets')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Tickets
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Ticket not found</h3>
            <p className="text-muted-foreground">
              This ticket doesn't exist or you don't have access to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG['New'];
  const priorityColor = PRIORITY_COLORS[incident.priority?.name] || PRIORITY_COLORS['Medium'];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/customer-portal/my-tickets')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Tickets
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-sm text-muted-foreground mb-1">
                {incident.incident_number || `#${incident.id.slice(0, 8)}`}
              </p>
              <CardTitle className="text-xl">{incident.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {(INCIDENT_STATUS_FLOW[incident.status as IncidentStatus] || []).length > 0 ? (
                <button
                  onClick={() => {
                    setSelectedStatus("");
                    setStatusComment("");
                    setStatusDialogOpen(true);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80 ${statusConfig.color}`}
                >
                  {statusConfig.icon}
                  <span>{statusConfig.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              ) : (
                <Badge className={statusConfig.color} variant="secondary">
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
              )}
              {incident.priority && (
                <Badge className={priorityColor} variant="outline">
                  {incident.priority.name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Reporter</p>
                <p className="font-medium">{incident.creator_name}</p>
              </div>
            </div>
            {incident.assignee_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Assignee</p>
                  <p className="font-medium">{incident.assignee_name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(incident.created_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>
            {incident.category && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{incident.category.name}</p>
                </div>
              </div>
            )}
            {incident.incident_project && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Project</p>
                  <p className="font-medium">{incident.incident_project.name}</p>
                </div>
              </div>
            )}
            {incident.resolved_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Resolved</p>
                  <p className="font-medium">{format(new Date(incident.resolved_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{incident.description || 'No description provided.'}</p>
        </CardContent>
      </Card>

      {/* Timeline / Comments */}
      {comments && comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={comment.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                      
                      {/* Display attachments */}
                      {comment.attachments && Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                      {(comment.attachments as CommentAttachment[]).map((attachment) => (
                            <CustomerAttachmentView key={attachment.id} attachment={attachment} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Change Dialog */}
      <Dialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!updateStatusMutation.isPending) {
            setStatusDialogOpen(open);
            if (!open) { setSelectedStatus(""); setStatusComment(""); }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div>
                <Badge className={statusConfig.color} variant="secondary">
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-status">New Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(v) => setSelectedStatus(v as IncidentStatus)}
              >
                <SelectTrigger id="new-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {(INCIDENT_STATUS_FLOW[incident.status as IncidentStatus] || []).map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CONFIG[status]?.color}`}>
                          {STATUS_CONFIG[status]?.icon}
                          <span className="ml-0.5">{STATUS_CONFIG[status]?.label ?? status}</span>
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-comment">Comment (Optional)</Label>
              <Textarea
                id="status-comment"
                placeholder="Add a note about this status change..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={3}
                disabled={updateStatusMutation.isPending}
              />
            </div>
            {selectedStatus && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                Status will change from{' '}
                <span className="font-medium">{incident.status}</span> to{' '}
                <span className="font-medium">{selectedStatus}</span>.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate({ newStatus: selectedStatus as IncidentStatus, comment: statusComment })}
              disabled={!selectedStatus || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Comment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add a Comment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); if (newComment.trim() || pendingAttachments.length > 0) addCommentMutation.mutate(newComment); }} className="space-y-3">
            <Textarea
              placeholder="Type your message here... (paste images directly)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onPaste={handlePaste}
              rows={3}
              disabled={addCommentMutation.isPending}
            />
            
            {/* Pending Attachments Preview */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="relative group flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5"
                  >
                    {attachment.preview ? (
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
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={addCommentMutation.isPending}
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
              disabled={addCommentMutation.isPending}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={addCommentMutation.isPending || pendingAttachments.length >= MAX_FILES}
                  className="gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach
                </Button>
                <span className="text-xs text-muted-foreground">
                  {pendingAttachments.length}/{MAX_FILES} files
                </span>
              </div>
              <Button 
                type="submit"
                disabled={(!newComment.trim() && pendingAttachments.length === 0) || addCommentMutation.isPending}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {addCommentMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
