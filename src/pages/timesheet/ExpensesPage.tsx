import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, DollarSign, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { 
  Expense, 
  fetchUserExpenses, 
  deleteExpense, 
  submitExpense,
  approveExpense,
  rejectExpense 
} from "@/lib/expense-service";
import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import MobileExpenseCard from "@/components/expenses/MobileExpenseCard";
import { useExpenseFilters } from "@/hooks/useExpenseFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseList from "@/components/expenses/ExpenseList";
import ExpenseApprovalDialog from "@/components/expenses/ExpenseApprovalDialog";
import ExpenseViewDialog from "@/components/expenses/ExpenseViewDialog";
import MultiExpenseEntryDialog from "@/components/expenses/MultiExpenseEntryDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { extractUserName } from "@/lib/expense-user-utils";
import { useExpenseRealtime } from "@/hooks/useExpenseRealtime";
import { useExpenseAttachmentsRealtime } from "@/hooks/useExpenseAttachmentsRealtime";

const ExpensesPage = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Enable real-time updates for expenses
  useExpenseRealtime();
  useExpenseAttachmentsRealtime();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMultiEntryOpen, setIsMultiEntryOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [approvingExpense, setApprovingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

  const isAdmin = userRole === 'admin';

  // Fetch expenses - let RLS handle the filtering
  const { 
    data: expenses = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ["expenses", user?.id, userRole],
    queryFn: () => fetchUserExpenses(), // Remove userId parameter, let RLS handle it
    enabled: !!user
  });

  // Use expense filters hook
  const {
    filters,
    setFilters,
    filteredExpenses,
    resetFilters,
    exportFilteredExpenses
  } = useExpenseFilters(expenses);

  // Get unique users for admin filter
  const userOptions = useMemo(() => {
    console.log("Raw expenses data for userOptions:", expenses.map(e => ({ 
      user_id: e.user_id, 
      user_name: e.user_name,
      user_name_type: typeof e.user_name,
      user_name_isArray: Array.isArray(e.user_name)
    })));

    const uniqueUsers = expenses.reduce((acc, expense) => {
      if (expense.user_id && expense.user_name) {
        let userName = '';
        
        // Use the helper function for consistent extraction
        userName = extractUserName(expense.user_name);
        
        if (userName && userName !== 'Unknown User') {
          acc[expense.user_id] = userName;
        }
      }
      return acc;
    }, {} as Record<string, string>);

    const options = Object.entries(uniqueUsers).map(([id, name]) => ({ id, name }));
    console.log("Generated userOptions:", options);
    return options;
  }, [expenses]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully"
      });
      setDeletingExpense(null);
    },
    onError: (error) => {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: submitExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Expense submitted",
        description: "Your expense has been submitted for approval"
      });
    },
    onError: (error) => {
      console.error("Error submitting expense:", error);
      toast({
        title: "Error",
        description: "Failed to submit expense. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ expenseId, notes }: { expenseId: string; notes?: string }) => 
      approveExpense(expenseId, user!.id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setApprovingExpense(null);
      toast({
        title: "Expense approved",
        description: "The expense has been approved successfully"
      });
    },
    onError: (error) => {
      console.error("Error approving expense:", error);
      toast({
        title: "Error",
        description: "Failed to approve expense. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ expenseId, reason, notes }: { expenseId: string; reason: string; notes?: string }) => 
      rejectExpense(expenseId, user!.id, reason, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setApprovingExpense(null);
      toast({
        title: "Expense rejected",
        description: "The expense has been rejected"
      });
    },
    onError: (error) => {
      console.error("Error rejecting expense:", error);
      toast({
        title: "Error",
        description: "Failed to reject expense. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateExpense = () => {
    setIsMultiEntryOpen(true);
  };

  const handleMultiEntrySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleViewExpense = (expense: Expense) => {
    setViewingExpense(expense);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  const confirmDelete = () => {
    if (deletingExpense) {
      deleteMutation.mutate(deletingExpense.id);
    }
  };

  const handleSubmitExpense = (expense: Expense) => {
    submitMutation.mutate(expense.id);
  };

  const handleApproveExpense = (expense: Expense) => {
    console.log('Setting approval action to: approve');
    setApprovalAction('approve');
    setApprovingExpense(expense);
  };

  const handleRejectExpense = (expense: Expense) => {
    console.log('Setting approval action to: reject');
    setApprovalAction('reject');
    setApprovingExpense(expense);
  };

  const handleApprovalDialogApprove = (expenseId: string, notes?: string) => {
    approveMutation.mutate({ expenseId, notes });
  };

  const handleApprovalDialogReject = (expenseId: string, reason: string, notes?: string) => {
    rejectMutation.mutate({ expenseId, reason, notes });
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  // Calculate stats
  const calculateStats = () => {
    const totalExpenses = filteredExpenses.length;
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pendingExpenses = filteredExpenses.filter(e => e.status === 'submitted').length;
    const approvedExpenses = filteredExpenses.filter(e => e.status === 'approved').length;
    const rejectedExpenses = filteredExpenses.filter(e => e.status === 'rejected').length;
    
    return {
      totalExpenses,
      totalAmount,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses
    };
  };

  const stats = calculateStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? "All Expenses" : "My Expenses"}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? "Manage and approve employee expenses" : "Track and manage your expenses"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => refetch()}
            variant="outline"
            title="Refresh expenses"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={handleCreateExpense} 
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <ExpenseFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={exportFilteredExpenses}
        onReset={resetFilters}
        userOptions={userOptions}
        showUserFilter={isAdmin}
      />


      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin ? "All Employee Expenses" : "Your Expenses"}
          </CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Clock className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : filteredExpenses.length > 0 ? (
            isMobile ? (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                  <MobileExpenseCard
                    key={expense.id}
                    expense={expense}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    onSubmit={handleSubmitExpense}
                    onView={handleViewExpense}
                    onApprove={isAdmin ? handleApproveExpense : undefined}
                    onReject={isAdmin ? handleRejectExpense : undefined}
                    showUserColumn={isAdmin}
                  />
                ))}
              </div>
            ) : (
              <ExpenseList
                expenses={filteredExpenses}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
                onSubmit={handleSubmitExpense}
                onView={handleViewExpense}
                onApprove={isAdmin ? handleApproveExpense : undefined}
                onReject={isAdmin ? handleRejectExpense : undefined}
                showUserColumn={isAdmin}
              />
            )
          ) : (
            <div className="p-8 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">
                {Object.values(filters).some(v => v !== "" && v !== undefined) 
                  ? "No expenses match your current filters" 
                  : isAdmin ? "No expenses found" : "No expenses yet"
                }
              </p>
              <Button onClick={handleCreateExpense}>
                Create Your First Expense
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Entry Dialog for Creating */}
      <MultiExpenseEntryDialog
        open={isMultiEntryOpen}
        onOpenChange={setIsMultiEntryOpen}
        onSuccess={handleMultiEntrySuccess}
      />

      {/* Form Dialog for Editing */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={editingExpense || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <ExpenseViewDialog
        expense={viewingExpense}
        isOpen={!!viewingExpense}
        onClose={() => setViewingExpense(null)}
      />

      {/* Approval Dialog */}
      <ExpenseApprovalDialog
        expense={approvingExpense}
        isOpen={!!approvingExpense}
        onClose={() => {
          setApprovingExpense(null);
          setApprovalAction(null);
        }}
        onApprove={handleApprovalDialogApprove}
        onReject={handleApprovalDialogReject}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
        initialAction={approvalAction || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingExpense} 
        onOpenChange={() => setDeletingExpense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
              {deletingExpense && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p><strong>Amount:</strong> {formatCurrency(deletingExpense.amount)}</p>
                  <p><strong>Description:</strong> {deletingExpense.description || 'No description'}</p>
                  <p><strong>Date:</strong> {new Date(deletingExpense.expense_date).toLocaleDateString()}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesPage;