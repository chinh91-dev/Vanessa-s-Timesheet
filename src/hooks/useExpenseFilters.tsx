import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Expense } from "@/lib/expense-service";
import { ExpenseFilterState } from "@/components/expenses/ExpenseFilters";
import { extractUserName } from "@/lib/expense-user-utils";

export const useExpenseFilters = (expenses: Expense[]) => {
  const [filters, setFilters] = useState<ExpenseFilterState>({
    search: "",
    category: "",
    status: "",
    startDate: undefined,
    endDate: undefined,
    minAmount: "",
    maxAmount: "",
    user: ""
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          expense.description?.toLowerCase().includes(searchTerm) ||
          expense.notes?.toLowerCase().includes(searchTerm) ||
          expense.category?.name?.toLowerCase().includes(searchTerm) ||
          expense.subcategory?.name?.toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && expense.category_id !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status && expense.status !== filters.status) {
        return false;
      }

      // User filter
      if (filters.user && expense.user_id !== filters.user) {
        return false;
      }

      // Date range filter
      if (filters.startDate) {
        const expenseDate = new Date(expense.expense_date);
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (expenseDate < startDate) return false;
      }

      if (filters.endDate) {
        const expenseDate = new Date(expense.expense_date);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (expenseDate > endDate) return false;
      }

      // Amount range filter
      if (filters.minAmount && expense.amount < parseFloat(filters.minAmount)) {
        return false;
      }

      if (filters.maxAmount && expense.amount > parseFloat(filters.maxAmount)) {
        return false;
      }

      return true;
    });
  }, [expenses, filters]);

  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      status: "",
      startDate: undefined,
      endDate: undefined,
      minAmount: "",
      maxAmount: "",
      user: ""
    });
  };

  const exportFilteredExpenses = () => {
    if (filteredExpenses.length === 0) {
      return;
    }

    // Create CSV content
    const headers = [
      "Date",
      "Category",
      "Subcategory",
      "Description",
      "Amount",
      "Status",
      "Employee",
      "Notes",
      "Submitted At",
      "Approved At"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredExpenses.map(expense => [
        expense.expense_date,
        `"${expense.category?.name || ''}"`,
        `"${expense.subcategory?.name || ''}"`,
        `"${expense.description || ''}"`,
        expense.amount.toFixed(2),
        expense.status,
        `"${extractUserName(expense.user_name)}"`,
        `"${expense.notes || ''}"`,
        expense.submitted_at ? format(new Date(expense.submitted_at), "yyyy-MM-dd HH:mm") : "",
        expense.approved_at ? format(new Date(expense.approved_at), "yyyy-MM-dd HH:mm") : ""
      ].join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    filters,
    setFilters,
    filteredExpenses,
    resetFilters,
    exportFilteredExpenses
  };
};