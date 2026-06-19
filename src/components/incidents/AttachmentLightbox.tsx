import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ChevronLeft, ChevronRight, Loader2, FileText, ExternalLink } from "lucide-react";
import type { CommentAttachment } from "@/types/incident-types";
import { storageHelpers } from "@/lib/storage-utils";

interface AttachmentLightboxProps {
  attachments: CommentAttachment[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

function isImage(fileType?: string) {
  return fileType?.startsWith("image/");
}

function isPdf(fileType?: string) {
  return fileType === "application/pdf";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function AttachmentLightbox({ attachments, initialIndex, open, onClose }: AttachmentLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const current = attachments[index];

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open || !current) return;
    setSignedUrl(null);
    setLoading(true);
    storageHelpers.commentAttachments
      .getSignedUrl(current.file_url)
      .then(url => setSignedUrl(url || null))
      .catch(() => setSignedUrl(null))
      .finally(() => setLoading(false));
  }, [current?.file_url, open]);

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(attachments.length - 1, i + 1));

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, attachments.length]);

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full p-0 bg-black/95 border-none gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-medium truncate">{current.file_name}</span>
            <span className="text-xs text-gray-400 shrink-0">{formatBytes(current.file_size)}</span>
            {attachments.length > 1 && (
              <span className="text-xs text-gray-400 shrink-0">
                {index + 1} / {attachments.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {signedUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = signedUrl;
                  a.download = current.file_name;
                  a.click();
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {signedUrl && !isImage(current.file_type) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={() => window.open(signedUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Viewer */}
        <div className="relative flex items-center justify-center min-h-[60vh] max-h-[80vh] overflow-hidden">
          {loading && (
            <Loader2 className="h-10 w-10 animate-spin text-white/60" />
          )}

          {!loading && signedUrl && isImage(current.file_type) && (
            <img
              src={signedUrl}
              alt={current.file_name}
              className="max-w-full max-h-[80vh] object-contain"
            />
          )}

          {!loading && signedUrl && isPdf(current.file_type) && (
            <iframe
              src={signedUrl}
              title={current.file_name}
              className="w-full h-[80vh]"
            />
          )}

          {!loading && signedUrl && !isImage(current.file_type) && !isPdf(current.file_type) && (
            <div className="flex flex-col items-center gap-4 text-white p-8">
              <FileText className="h-16 w-16 text-gray-400" />
              <p className="text-lg font-medium">{current.file_name}</p>
              <p className="text-sm text-gray-400">{formatBytes(current.file_size)}</p>
              <Button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = signedUrl;
                  a.download = current.file_name;
                  a.click();
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          )}

          {!loading && !signedUrl && (
            <p className="text-white/60">Failed to load attachment.</p>
          )}

          {/* Prev / Next */}
          {attachments.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                disabled={index === 0}
                onClick={prev}
                className="absolute left-2 text-white hover:text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={index === attachments.length - 1}
                onClick={next}
                className="absolute right-2 text-white hover:text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail strip for multi-attachment */}
        {attachments.length > 1 && (
          <div className="flex gap-2 px-4 py-3 bg-black/80 overflow-x-auto">
            {attachments.map((att, i) => (
              <button
                key={att.id}
                onClick={() => setIndex(i)}
                className={`shrink-0 h-12 w-12 rounded border-2 overflow-hidden ${
                  i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                {isImage(att.file_type) ? (
                  <ThumbnailImg fileUrl={att.file_url} alt={att.file_name} />
                ) : (
                  <div className="h-full w-full bg-gray-700 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ThumbnailImg({ fileUrl, alt }: { fileUrl: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    storageHelpers.commentAttachments.getSignedUrl(fileUrl).then(url => setSrc(url || null));
  }, [fileUrl]);
  if (!src) return <div className="h-full w-full bg-gray-700" />;
  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}
