import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Lock, FileText, Download, History, ArrowRight, Loader2, Pencil, Check, X, Mail } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CommentAttachmentUploader, useCommentPasteHandler } from "@/components/customer-portal/CommentAttachmentUploader";
import { supabase } from "@/integrations/supabase/client";
import { storageHelpers } from "@/lib/storage-utils";
import { useQuery } from "@tanstack/react-query";
import { TimeLoggerInput, useTimeLoggerState } from "@/components/shared/TimeLoggerInput";
import { useQuickTimeEntry } from "@/hooks/useQuickTimeEntry";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { useUpdateComment } from "@/hooks/useIncidents";
import { useAuth } from "@/context/AuthContext";
import type { IncidentComment, CommentAttachment } from "@/types/incident-types";

interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
}

interface IncidentHistoryItem {
  id: string;
  incident_id: string;
  user_id: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  old_display_value: string | null;
  new_display_value: string | null;
  created_at: string;
  user_name?: string;
}

interface ActivityItem {
  type: 'comment' | 'history';
  data: IncidentComment | IncidentHistoryItem;
  timestamp: string;
}

interface ActivitySectionProps {
  incidentId: string;
  comments: IncidentComment[];
  onAddComment: (content: string, isInternal: boolean, attachments?: CommentAttachment[]) => Promise<void>;
  isLoading?: boolean;
}

// Hook to fetch incident history
function useIncidentHistory(incidentId: string) {
  return useQuery({
    queryKey: ['incident-history', incidentId],
    queryFn: async () => {
      const { data: historyData, error } = await supabase
        .from('incident_history')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names for history items
      const userIds = [...new Set((historyData || []).map(h => h.user_id).filter(Boolean))];
      let userNames: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('all_users')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        
        (users || []).forEach(u => {
          userNames[u.user_id] = u.full_name || u.email || 'Unknown';
        });
      }

      return (historyData || []).map(h => ({
        ...h,
        user_name: h.user_id ? userNames[h.user_id] || 'Unknown' : 'System'
      })) as IncidentHistoryItem[];
    },
    enabled: !!incidentId,
  });
}

export function ActivitySection({ 
  incidentId,
  comments, 
  onAddComment, 
  isLoading = false 
}: ActivitySectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [timeLogData, setTimeLogData] = useTimeLoggerState();
  const [lightboxCommentId, setLightboxCommentId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { createFromIncident } = useQuickTimeEntry();
  const { user } = useAuth();
  const updateComment = useUpdateComment();

  const { data: history = [], isLoading: historyLoading } = useIncidentHistory(incidentId);

  // Combine comments and history into unified timeline
  const activityItems = useMemo(() => {
    const items: ActivityItem[] = [
      ...comments.map(c => ({ 
        type: 'comment' as const, 
        data: c, 
        timestamp: c.created_at 
      })),
      ...history.map(h => ({ 
        type: 'history' as const, 
        data: h, 
        timestamp: h.created_at 
      }))
    ];
    return items.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [comments, history]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'comments') return activityItems.filter(i => i.type === 'comment');
    if (activeTab === 'history') return activityItems.filter(i => i.type === 'history');
    return activityItems;
  }, [activityItems, activeTab]);

  const handlePasteFiles = (files: File[]) => {
    const newAttachments: PendingAttachment[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    setPendingAttachments(prev => [...prev, ...newAttachments].slice(0, 5));
  };

  const pasteHandler = useCommentPasteHandler(handlePasteFiles, isSubmitting);

  const uploadAttachments = async (): Promise<CommentAttachment[]> => {
    const uploaded: CommentAttachment[] = [];
    const failed: string[] = [];

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || 'anonymous';
    
    for (const attachment of pendingAttachments) {
      const fileExt = attachment.file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('comment-attachments')
        .upload(filePath, attachment.file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) {
        console.error('Failed to upload attachment:', error);
        failed.push(attachment.file.name);
        continue;
      }
      
      uploaded.push({
        id: attachment.id,
        file_name: attachment.file.name,
        file_url: filePath,
        file_type: attachment.file.type,
        file_size: attachment.file.size
      });
    }

    if (failed.length > 0) {
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Some attachments failed to upload",
        description: `Failed: ${failed.join(', ')}`,
        variant: "destructive",
      });
    }
    
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && pendingAttachments.length === 0) return;

    setIsSubmitting(true);
    try {
      const attachments = pendingAttachments.length > 0 
        ? await uploadAttachments() 
        : undefined;
      
      await onAddComment(newComment.trim(), isInternal, attachments);
      
      // Log time if enabled
      if (timeLogData.enabled && timeLogData.hours > 0) {
        await createFromIncident.mutateAsync({
          incidentId,
          hours: timeLogData.hours,
          notes: newComment.trim() || "Time logged from incident activity",
          startTime: timeLogData.mode === "timeframe" ? timeLogData.startTime : undefined,
          endTime: timeLogData.mode === "timeframe" ? timeLogData.endTime : undefined,
        });
      }
      
      setNewComment("");
      setIsInternal(false);
      setTimeLogData({ enabled: false, mode: "duration", hours: 0, startTime: "", endTime: "" });
      pendingAttachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setPendingAttachments([]);
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImage = (fileType?: string) => fileType?.startsWith('image/');

  function AttachmentThumbnail({ attachment }: { attachment: CommentAttachment }) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading');
    React.useEffect(() => {
      setLoadState('loading');
      storageHelpers.commentAttachments.getSignedUrl(attachment.file_url)
        .then(url => {
          if (url) {
            setSignedUrl(url);
            setLoadState('success');
          } else {
            setLoadState('error');
          }
        })
        .catch(() => setLoadState('error'));
    }, [attachment.file_url]);

    if (loadState === 'loading') {
      return <div className="h-40 w-full bg-muted rounded flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }
    if (loadState === 'error') {
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm max-w-[150px] truncate">{attachment.file_name}</span>
          <span className="text-xs text-destructive">(preview failed)</span>
        </div>
      );
    }
    return <img src={signedUrl!} alt={attachment.file_name} className="max-h-64 max-w-full object-contain rounded" />;
  }

  const getFieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      'status': 'Status',
      'assigned_to': 'Assignee',
      'priority_id': 'Priority',
      'category_id': 'Category',
    };
    return labels[fieldName] || fieldName;
  };

  const lightboxComment = lightboxCommentId ? comments.find(c => c.id === lightboxCommentId) : null;

  const renderActivityItem = (item: ActivityItem) => {
    if (item.type === 'comment') {
      const comment = item.data as IncidentComment;
      const isEditing = editingId === comment.id;
      const isAuthor = user?.id === comment.created_by;
      return (
        <div key={comment.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {comment.author?.full_name?.charAt(0) || comment.author?.email?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="font-medium text-sm">
                {comment.author?.full_name || comment.author?.email || "Unknown User"}
              </span>
              <span className="text-xs text-muted-foreground" title={format(new Date(comment.created_at), "PPPp")}>
                {format(new Date(comment.created_at), "d MMM yyyy, h:mm a")}
              </span>
              {comment.edited_at && (
                <span className="text-xs text-muted-foreground italic">
                  (edited {format(new Date(comment.edited_at), "d MMM, h:mm a")})
                </span>
              )}
              <Badge variant="secondary" className="text-xs">COMMENTS</Badge>
              {comment.is_internal && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700">
                  <Lock className="h-3 w-3" />
                  Internal note
                </Badge>
              )}
              {!comment.is_internal && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  Emailed
                </span>
              )}
              {isAuthor && !isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto shrink-0"
                  onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                  title="Edit comment"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div className={`ml-10 p-3 rounded-lg ${
            comment.is_internal
              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
              : 'bg-muted'
          }`}>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Escape") { setEditingId(null); setEditContent(""); }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      if (editContent.trim() && editContent.trim() !== comment.content) {
                        updateComment.mutateAsync({ commentId: comment.id, content: editContent.trim(), incidentId })
                          .then(() => { setEditingId(null); setEditContent(""); });
                      } else {
                        setEditingId(null); setEditContent("");
                      }
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={updateComment.isPending}
                    onClick={async () => {
                      if (editContent.trim() && editContent.trim() !== comment.content) {
                        await updateComment.mutateAsync({ commentId: comment.id, content: editContent.trim(), incidentId });
                      }
                      setEditingId(null); setEditContent("");
                    }}
                  >
                    <Check className="h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditContent(""); }}>
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">Ctrl+Enter to save</span>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {comment.attachments.map((attachment, idx) => (
                      isImage(attachment.file_type) ? (
                        <button
                          key={attachment.id}
                          type="button"
                          onClick={() => { setLightboxCommentId(comment.id); setLightboxIndex(idx); }}
                          className="block relative group rounded-md overflow-hidden border hover:ring-2 ring-primary transition-all"
                          title={`${attachment.file_name} — click to view full size`}
                        >
                          <AttachmentThumbnail attachment={attachment} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                      ) : (
                        <button
                          key={attachment.id}
                          type="button"
                          onClick={() => { setLightboxCommentId(comment.id); setLightboxIndex(idx); }}
                          className="flex items-center gap-2 px-3 py-2 rounded border bg-background hover:bg-muted transition-colors text-sm max-w-[300px]"
                          title={attachment.file_name}
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{attachment.file_name}</span>
                        </button>
                      )
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    } else {
      const historyItem = item.data as IncidentHistoryItem;
      
      // Special handling for assignment changes
      if (historyItem.field_name === 'assigned_to') {
        const isNewAssignment = !historyItem.old_value || historyItem.old_display_value === 'Unassigned';
        const isUnassignment = !historyItem.new_value || historyItem.new_display_value === 'Unassigned';
        
        return (
          <div key={historyItem.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {historyItem.user_name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <span className="font-medium text-sm">
                  {historyItem.user_name || "System"}
                </span>
                {isNewAssignment && !isUnassignment ? (
                  <>
                    <span className="text-muted-foreground text-sm">assigned to</span>
                    <span className="font-medium text-sm text-primary">
                      {historyItem.new_display_value || historyItem.new_value}
                    </span>
                  </>
                ) : isUnassignment && !isNewAssignment ? (
                  <>
                    <span className="text-muted-foreground text-sm">unassigned</span>
                    <span className="font-medium text-sm">
                      {historyItem.old_display_value || historyItem.old_value}
                    </span>
                  </>
                ) : isUnassignment && isNewAssignment ? (
                  <span className="text-muted-foreground text-sm">cleared the assignment</span>
                ) : (
                  <>
                    <span className="text-muted-foreground text-sm">reassigned from</span>
                    <span className="font-medium text-sm">
                      {historyItem.old_display_value || historyItem.old_value}
                    </span>
                    <span className="text-muted-foreground text-sm">to</span>
                    <span className="font-medium text-sm text-primary">
                      {historyItem.new_display_value || historyItem.new_value}
                    </span>
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(historyItem.created_at), "d MMM yyyy, h:mm a")}
                </span>
                
                <Badge variant="outline" className="text-xs">
                  HISTORY
                </Badge>
              </div>
            </div>
          </div>
        );
      }
      
      // Default history rendering for other fields
      return (
        <div key={historyItem.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {historyItem.user_name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="font-medium text-sm">
                {historyItem.user_name || "System"}
              </span>
              <span className="text-muted-foreground text-sm">
                changed the {getFieldLabel(historyItem.field_name)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(historyItem.created_at), "d MMM yyyy, h:mm a")}
              </span>
              
              <Badge variant="outline" className="text-xs">
                HISTORY
              </Badge>
            </div>
          </div>
          
          <div className="ml-10 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {historyItem.old_display_value || historyItem.old_value || 'None'}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              {historyItem.new_display_value || historyItem.new_value || 'None'}
            </Badge>
          </div>
        </div>
      );
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onPaste={pasteHandler}
            rows={3}
            disabled={isSubmitting}
          />
          
          <CommentAttachmentUploader
            attachments={pendingAttachments}
            onAttachmentsChange={setPendingAttachments}
            disabled={isSubmitting}
          />
          
          <TimeLoggerInput
            value={timeLogData}
            onChange={setTimeLogData}
            disabled={isSubmitting}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="internal" 
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked === true)}
                disabled={isSubmitting}
              />
              <Label htmlFor="internal" className="text-sm">
                Internal comment (not visible to requester)
              </Label>
            </div>
            
            <Button 
              type="submit" 
              size="sm"
              disabled={(!newComment.trim() && pendingAttachments.length === 0) || isSubmitting}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add Comment"}
            </Button>
          </div>
        </form>

        {/* Activity Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-4">
              {isLoading || historyLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-muted rounded-full"></div>
                        <div className="h-4 bg-muted rounded w-24"></div>
                      </div>
                      <div className="h-16 bg-muted rounded ml-10"></div>
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {activeTab === 'comments' ? (
                    <>
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No comments yet. Be the first to add one!</p>
                    </>
                  ) : activeTab === 'history' ? (
                    <>
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No history recorded yet.</p>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No activity yet.</p>
                    </>
                  )}
                </div>
              ) : (
                filteredItems.map(renderActivityItem)
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {lightboxComment && lightboxComment.attachments && (
      <AttachmentLightbox
        attachments={lightboxComment.attachments}
        initialIndex={lightboxIndex}
        open={!!lightboxCommentId}
        onClose={() => setLightboxCommentId(null)}
      />
    )}
    </>
  );
}
