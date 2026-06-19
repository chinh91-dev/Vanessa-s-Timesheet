import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Send, 
  Eye, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  User,
} from "lucide-react";
import { Expense } from "@/lib/expense-service";
import { ReceiptViewButton } from "./ReceiptViewButton";
import { useAuth } from "@/context/AuthContext";
import { extractUserName } from "@/lib/expense-user-utils";

interface MobileExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onSubmit?: (expense: Expense) => void;
  onView?: (expense: Expense) => void;
  onApprove?: (expense: Expense) => void;
  onReject?: (expense: Expense) => void;
  showUserColumn?: boolean;
}

const MobileExpenseCard: React.FC<MobileExpenseCardProps> = ({
  expense,
  onEdit,
  onDelete,
  onSubmit,
  onView,
  onApprove,
  onReject,
  showUserColumn = false
}) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      submitted: "default",
      approved: "default",
      rejected: "destructive"
    } as const;

    const colors = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800", 
      rejected: "bg-red-100 text-red-800"
    };

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || "secondary"}
        className={colors[status as keyof typeof colors]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const canEdit = (expense: Expense) => {
    return expense.status === 'draft' || (isAdmin && expense.status !== 'approved');
  };

  const canDelete = (expense: Expense) => {
    return expense.status === 'draft' || isAdmin;
  };

  const canSubmit = (expense: Expense) => {
    return expense.status === 'draft';
  };


  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with amount and status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(expense.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(expense.status)}
              <ReceiptViewButton
                expenseId={expense.id}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(expense)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  
                  
                  {canEdit(expense) && (
                    <DropdownMenuItem onClick={() => onEdit(expense)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  
                  {canSubmit(expense) && onSubmit && (
                    <DropdownMenuItem onClick={() => onSubmit(expense)}>
                      <Send className="mr-2 h-4 w-4" />
                      Submit for Approval
                    </DropdownMenuItem>
                  )}
                  
                  {/* Admin approval actions */}
                  {isAdmin && expense.status === 'submitted' && onApprove && (
                    <DropdownMenuItem onClick={() => onApprove(expense)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </DropdownMenuItem>
                  )}
                  
                  {isAdmin && expense.status === 'submitted' && onReject && (
                    <DropdownMenuItem onClick={() => onReject(expense)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </DropdownMenuItem>
                  )}
                  
                  {canDelete(expense) && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(expense)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Date and category */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(expense.expense_date)}</span>
            </div>
            {expense.category?.name && (
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{expense.category.name}</span>
              </div>
            )}
          </div>

          {/* Category and subcategory */}
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {expense.category?.name}
              {expense.subcategory?.name && (
                <span className="text-muted-foreground font-normal">
                  {" • "}{expense.subcategory.name}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div className="text-sm">
              <span className="font-medium">Description: </span>
              <span className="text-muted-foreground">{expense.description}</span>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div className="text-sm">
              <span className="font-medium">Notes: </span>
              <span className="text-muted-foreground line-clamp-2">{expense.notes}</span>
            </div>
          )}

          {/* User info for admin view */}
          {showUserColumn && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{extractUserName(expense.user_name)}</span>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
};

export default MobileExpenseCard;