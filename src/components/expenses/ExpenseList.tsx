import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Edit, Trash2, Send, Eye, CheckCircle, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Expense } from "@/lib/expense-service";
import { ReceiptViewButton } from "./ReceiptViewButton";
import { useAuth } from "@/context/AuthContext";
import { extractUserName } from "@/lib/expense-user-utils";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onSubmit?: (expense: Expense) => void;
  onView?: (expense: Expense) => void;
  onApprove?: (expense: Expense) => void;
  onReject?: (expense: Expense) => void;
  showUserColumn?: boolean;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
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
    return new Date(dateString).toLocaleDateString('en-AU');
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


  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No expenses found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="px-4 py-4 font-semibold">Date</TableHead>
              <TableHead className="px-4 py-4 font-semibold">Category</TableHead>
              <TableHead className="px-4 py-4 font-semibold">Description</TableHead>
              <TableHead className="px-4 py-4 font-semibold text-right">Amount</TableHead>
              <TableHead className="px-4 py-4 font-semibold">Status</TableHead>
              {showUserColumn && <TableHead className="px-4 py-4 font-semibold">Employee</TableHead>}
              <TableHead className="px-4 py-4 font-semibold text-center">Receipt</TableHead>
              <TableHead className="px-4 py-4 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <TableCell className="px-4 py-4">
                  <div className="text-sm font-medium">
                    {formatDate(expense.expense_date)}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{expense.category?.name}</div>
                    {expense.subcategory?.name && (
                      <div className="text-xs text-muted-foreground">
                        {expense.subcategory.name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="space-y-1 max-w-xs">
                    {expense.description && (
                      <div className="font-medium text-sm">{expense.description}</div>
                    )}
                    {expense.notes && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {expense.notes}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-right">
                  <div className="font-semibold text-sm">
                    {formatCurrency(expense.amount)}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  {getStatusBadge(expense.status)}
                </TableCell>
                {showUserColumn && (
                  <TableCell className="px-4 py-4">
                    <div className="font-medium text-sm">
                      {extractUserName(expense.user_name)}
                    </div>
                  </TableCell>
                )}
                <TableCell className="px-4 py-4 text-center">
                  <ReceiptViewButton
                    expenseId={expense.id}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ExpenseList;