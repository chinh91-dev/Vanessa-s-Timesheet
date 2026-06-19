import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Loader2, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  ExpenseAttachment,
  fetchExpenseAttachments,
  getReceiptSignedUrl,
} from "@/lib/expense-service";

interface Props {
  expenseId: string;
  variant?: "compact" | "list";
  className?: string;
}

export const ReceiptViewButton: React.FC<Props> = ({
  expenseId,
  variant = "compact",
  className,
}) => {
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: attachments = [], isLoading: fetching } = useQuery<ExpenseAttachment[]>({
    queryKey: ["expense-attachments", expenseId],
    queryFn: () => fetchExpenseAttachments(expenseId),
    enabled: !!expenseId,
  });

  const openPath = async (id: string, path: string) => {
    setOpeningId(id);
    try {
      const signedUrl = await getReceiptSignedUrl(path);
      if (signedUrl) window.open(signedUrl, "_blank");
      else toast.error("Unable to access receipt");
    } catch (error) {
      console.error("Error viewing receipt:", error);
      toast.error("Failed to load receipt");
    } finally {
      setOpeningId(null);
    }
  };

  if (fetching) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
        Receipt
      </Button>
    );
  }

  if (attachments.length === 0) return null;

  if (variant === "list") {
    return (
      <div className={`flex flex-col gap-2 ${className ?? ""}`}>
        {attachments.map((att) => (
          <Button
            key={att.id}
            variant="outline"
            size="sm"
            onClick={() => openPath(att.id, att.file_url)}
            disabled={openingId === att.id}
            className="flex items-center gap-2 w-fit"
          >
            {openingId === att.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {att.file_name}
          </Button>
        ))}
      </div>
    );
  }

  // compact: single attachment → single button. Multiple → dropdown.
  if (attachments.length > 1) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={openingId !== null}
            className={className}
          >
            {openingId !== null ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <FileText className="mr-2 h-3 w-3" />
            )}
            Receipt ({attachments.length})
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-xs">
          {attachments.map((att) => (
            <DropdownMenuItem
              key={att.id}
              onClick={() => openPath(att.id, att.file_url)}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{att.file_name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const target = { id: attachments[0].id, path: attachments[0].file_url };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openPath(target.id, target.path)}
      disabled={openingId !== null}
      className={className}
    >
      {openingId !== null ? (
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <FileText className="mr-2 h-3 w-3" />
      )}
      Receipt
    </Button>
  );
};

export default ReceiptViewButton;
