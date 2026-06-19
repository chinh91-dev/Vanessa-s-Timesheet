import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, User, FileText, Tag } from "lucide-react";
import { Expense } from "@/lib/expense-service";
import { ReceiptViewButton } from "./ReceiptViewButton";
import { extractUserName } from "@/lib/expense-user-utils";

interface ExpenseViewDialogProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

const ExpenseViewDialog: React.FC<ExpenseViewDialogProps> = ({
  expense,
  isOpen,
  onClose
}) => {
  if (!expense) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
      submitted: { label: "Submitted", className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Approved", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Expense Details</span>
            {getStatusBadge(expense.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold">Amount:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(expense.amount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">Date:</span>
              <span>{formatDate(expense.expense_date)}</span>
            </div>
          </div>

          {/* Category and Subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-purple-600" />
              <span className="font-semibold">Category:</span>
              <span>{expense.category?.name || 'N/A'}</span>
            </div>

            {expense.subcategory && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-600" />
                <span className="font-semibold">Sub-Category:</span>
                <span>{expense.subcategory?.name || 'N/A'}</span>
              </div>
            )}
          </div>

          {/* Employee */}
          {expense.user_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-600" />
              <span className="font-semibold">Employee:</span>
              <span>{extractUserName(expense.user_name)}</span>
            </div>
          )}

          {/* Description */}
          {expense.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="font-semibold">Description:</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {expense.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="font-semibold">Notes:</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {expense.status === 'rejected' && expense.rejection_reason && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-red-600">Rejection Reason:</span>
              </div>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                {expense.rejection_reason}
              </p>
            </div>
          )}

          {/* Receipts / Attachments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">Receipts:</span>
            </div>
            <ReceiptViewButton
              expenseId={expense.id}
              variant="list"
            />
          </div>


          {/* Created/Updated timestamps */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>Created: {new Date(expense.created_at).toLocaleString('en-AU')}</p>
            {expense.updated_at && (
              <p>Updated: {new Date(expense.updated_at).toLocaleString('en-AU')}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseViewDialog;