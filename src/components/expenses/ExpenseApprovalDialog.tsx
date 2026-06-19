import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Calendar, DollarSign, User, FileText } from "lucide-react";
import { Expense } from "@/lib/expense-service";
import { ReceiptViewButton } from "./ReceiptViewButton";
import { extractUserName } from "@/lib/expense-user-utils";

interface ExpenseApprovalDialogProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (expenseId: string, notes?: string) => void;
  onReject: (expenseId: string, reason: string, notes?: string) => void;
  isLoading?: boolean;
  initialAction?: 'approve' | 'reject';
}

const ExpenseApprovalDialog: React.FC<ExpenseApprovalDialogProps> = ({
  expense,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading = false,
  initialAction
}) => {
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [action, setAction] = useState<'approve' | 'reject' | null>(initialAction || null);
  
  console.log('ExpenseApprovalDialog - initialAction:', initialAction, 'action:', action);

  useEffect(() => {
    if (initialAction) {
      console.log('Setting action from initialAction:', initialAction);
      setAction(initialAction);
    }
  }, [initialAction]);

  const handleApprove = () => {
    if (expense) {
      onApprove(expense.id, notes);
      handleClose();
    }
  };

  const handleReject = () => {
    if (expense && rejectionReason.trim()) {
      onReject(expense.id, rejectionReason, notes);
      handleClose();
    }
  };

  const handleClose = () => {
    setNotes("");
    setRejectionReason("");
    setAction(initialAction || null);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-500", label: "Draft" },
      submitted: { color: "bg-blue-500", label: "Pending" },
      approved: { color: "bg-green-500", label: "Approved" },
      rejected: { color: "bg-red-500", label: "Rejected" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expense Approval
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Expense Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div className="space-y-3">
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
                <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <span className="font-semibold">Employee:</span>
                <span>{extractUserName(expense.user_name)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-semibold">Status:</span>
                <div className="mt-1">{getStatusBadge(expense.status)}</div>
              </div>

              <div>
                <span className="font-semibold">Category:</span>
                <div className="mt-1">{expense.category?.name || 'Unknown'}</div>
              </div>

              {expense.subcategory && (
                <div>
                  <span className="font-semibold">Subcategory:</span>
                  <div className="mt-1">{expense.subcategory.name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div>
              <Label className="font-semibold">Description</Label>
              <div className="mt-2 p-3 bg-muted rounded border">
                {expense.description}
              </div>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div>
              <Label className="font-semibold">Notes</Label>
              <div className="mt-2 p-3 bg-muted rounded border">
                {expense.notes}
              </div>
            </div>
          )}

          {/* Receipts / Attachments */}
          <div>
            <Label className="font-semibold">Receipts</Label>
            <div className="mt-2">
              <ReceiptViewButton
                expenseId={expense.id}
                variant="list"
              />
            </div>
          </div>

          {/* Rejection Reason (if previously rejected) */}
          {expense.status === 'rejected' && expense.rejection_reason && (
            <div>
              <Label className="font-semibold text-red-600">Rejection Reason</Label>
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                {expense.rejection_reason}
              </div>
            </div>
          )}

          {/* Action Selection */}
          {expense.status === 'submitted' && !action && !initialAction && (
            <div className="flex gap-3">
              <Button 
                onClick={() => setAction('approve')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                onClick={() => setAction('reject')}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {/* Approval Form */}
          {action === 'approve' && (
            <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded">
              <h4 className="font-semibold text-green-800">Approve Expense</h4>
              <div>
                <Label htmlFor="approval-notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any comments about this approval..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {action === 'reject' && (
            <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded">
              <h4 className="font-semibold text-red-800">Reject Expense</h4>
              <div>
                <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejecting this expense..."
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rejection-notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="rejection-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional comments..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            {action === 'approve' && (
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Approving..." : "Confirm Approval"}
              </Button>
            )}
            
            {action === 'reject' && (
              <Button
                onClick={handleReject}
                disabled={isLoading || !rejectionReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                {isLoading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseApprovalDialog;