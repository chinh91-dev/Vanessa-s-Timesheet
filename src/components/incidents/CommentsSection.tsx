import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Lock, FileText, Loader2, Pencil, Check, X, Mail } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CommentAttachmentUploader, useCommentPasteHandler } from "@/components/customer-portal/CommentAttachmentUploader";
import { supabase } from "@/integrations/supabase/client";
import { storageHelpers } from "@/lib/storage-utils";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { useUpdateComment } from "@/hooks/useIncidents";
import type { IncidentComment, CommentAttachment } from "@/types/incident-types";

interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
}

interface CommentsSectionProps {
  incidentId: string;
  comments: IncidentComment[];
  onAddComment: (content: string, isInternal: boolean, attachments?: CommentAttachment[]) => Promise<void>;
  currentUserId?: string;
  isLoading?: boolean;
}

function isImage(fileType?: string) {
  return fileType?.startsWith("image/");
}

function AttachmentThumb({ attachment, onClick }: { attachment: CommentAttachment; onClick: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  React.useEffect(() => {
    storageHelpers.commentAttachments.getSignedUrl(attachment.file_url)
      .then(url => setSignedUrl(url || null))
      .catch(() => {});
  }, [attachment.file_url]);

  if (isImage(attachment.file_type)) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block relative group rounded-md overflow-hidden border hover:ring-2 ring-primary transition-all"
        title={`${attachment.file_name} — click to view full size`}
      >
        {signedUrl
          ? <img src={signedUrl} alt={attachment.file_name} className="max-h-64 max-w-full object-contain" />
          : <div className="h-40 w-full bg-muted flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        }
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded border bg-background hover:bg-muted transition-colors text-sm max-w-[200px]"
      title={attachment.file_name}
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{attachment.file_name}</span>
    </button>
  );
}

export function CommentsSection({
  incidentId,
  comments,
  onAddComment,
  currentUserId,
  isLoading = false,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  // Lightbox state
  const [lightboxCommentId, setLightboxCommentId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const updateComment = useUpdateComment();

  const handlePasteFiles = (files: File[]) => {
    const newAttachments: PendingAttachment[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setPendingAttachments(prev => [...prev, ...newAttachments].slice(0, 5));
  };

  const pasteHandler = useCommentPasteHandler(handlePasteFiles, isSubmitting);

  const uploadAttachments = async (): Promise<CommentAttachment[]> => {
    const uploaded: CommentAttachment[] = [];
    for (const attachment of pendingAttachments) {
      const fileExt = attachment.file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;
      const { error } = await supabase.storage
        .from("comment-attachments")
        .upload(filePath, attachment.file);
      if (error) { console.error("Failed to upload attachment:", error); continue; }
      uploaded.push({
        id: attachment.id,
        file_name: attachment.file.name,
        file_url: filePath,
        file_type: attachment.file.type,
        file_size: attachment.file.size,
      });
    }
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && pendingAttachments.length === 0) return;
    setIsSubmitting(true);
    try {
      const attachments = pendingAttachments.length > 0 ? await uploadAttachments() : undefined;
      await onAddComment(newComment.trim(), isInternal, attachments);
      setNewComment("");
      setIsInternal(false);
      pendingAttachments.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
      setPendingAttachments([]);
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (comment: IncidentComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = async (comment: IncidentComment) => {
    if (!editContent.trim() || editContent.trim() === comment.content) {
      cancelEdit();
      return;
    }
    await updateComment.mutateAsync({ commentId: comment.id, content: editContent.trim(), incidentId });
    cancelEdit();
  };

  const openLightbox = (commentId: string, attachmentIndex: number) => {
    setLightboxCommentId(commentId);
    setLightboxIndex(attachmentIndex);
  };

  const lightboxComment = lightboxCommentId ? comments.find(c => c.id === lightboxCommentId) : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Add a comment... (emails will be sent to reporter and assignee)"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onPaste={pasteHandler}
              rows={3}
              disabled={isSubmitting}
            />

            <CommentAttachmentUploader
              attachments={pendingAttachments}
              onAttachmentsChange={setPendingAttachments}
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={checked => setIsInternal(checked === true)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="internal" className="text-sm">Internal (not visible to requester)</Label>
                </div>
                {!isInternal && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    Emails reporter &amp; assignee
                  </div>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={(!newComment.trim() && pendingAttachments.length === 0) || isSubmitting}
                className="flex items-center gap-2 shrink-0"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-muted rounded-full" />
                      <div className="h-4 bg-muted rounded w-24" />
                    </div>
                    <div className="h-16 bg-muted rounded ml-10" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No comments yet.</p>
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        {comment.author?.full_name?.charAt(0) || comment.author?.email?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">
                        {comment.author?.full_name || comment.author?.email || "Unknown"}
                      </span>

                      <span className="text-xs text-muted-foreground shrink-0" title={format(new Date(comment.created_at), "PPPp")}>
                        {format(new Date(comment.created_at), "d MMM yyyy, h:mm a")}
                      </span>

                      {comment.edited_at && (
                        <span className="text-xs text-muted-foreground shrink-0 italic">
                          (edited {format(new Date(comment.edited_at), "d MMM, h:mm a")})
                        </span>
                      )}

                      {comment.is_internal && (
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700 shrink-0">
                          <Lock className="h-3 w-3" />
                          Internal
                        </Badge>
                      )}

                      {/* Edit button — only for comment author */}
                      {currentUserId === comment.created_by && editingId !== comment.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={() => startEdit(comment)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {currentUserId === comment.created_by && editingId !== comment.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => startEdit(comment)}
                        title="Edit comment"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className={`ml-10 p-3 rounded-lg ${
                    comment.is_internal
                      ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                      : "bg-muted"
                  }`}>
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={3}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Escape") cancelEdit();
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit(comment);
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => saveEdit(comment)} disabled={updateComment.isPending} className="gap-1">
                            <Check className="h-3 w-3" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
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
                            {comment.attachments.map((att, idx) => (
                              <AttachmentThumb
                                key={att.id}
                                attachment={att}
                                onClick={() => openLightbox(comment.id, idx)}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
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
