import { supabase } from "@/integrations/supabase/client";

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseSubcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string;
  subcategory_id?: string;
  amount: number;
  description?: string;
  expense_date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  category?: ExpenseCategory;
  subcategory?: ExpenseSubcategory;
  user_name?: string;
  approved_by_name?: string;
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_at: string;
}

// Fetch expense categories
export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  try {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      console.error("Error fetching expense categories:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchExpenseCategories:", error);
    throw error;
  }
};

// Fetch expense subcategories for a category
export const fetchExpenseSubcategories = async (categoryId: string): Promise<ExpenseSubcategory[]> => {
  try {
    const { data, error } = await supabase
      .from("expense_subcategories")
      .select("*")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      console.error("Error fetching expense subcategories:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchExpenseSubcategories:", error);
    throw error;
  }
};

// Fetch all subcategories
export const fetchAllExpenseSubcategories = async (): Promise<ExpenseSubcategory[]> => {
  try {
    const { data, error } = await supabase
      .from("expense_subcategories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      console.error("Error fetching all expense subcategories:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchAllExpenseSubcategories:", error);
    throw error;
  }
};

// Fetch user's expenses
export const fetchUserExpenses = async (userId?: string): Promise<Expense[]> => {
  try {
    let query = supabase
      .from("expenses")
      .select(`
        *,
        category:expense_categories(*),
        subcategory:expense_subcategories(*),
        user_name:profiles!expenses_user_id_fkey(full_name),
        approved_by_name:profiles!expenses_approved_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching expenses:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchUserExpenses:", error);
    throw error;
  }
};

// Create new expense
export const createExpense = async (expense: Partial<Expense>): Promise<Expense> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([{
        user_id: expense.user_id,
        category_id: expense.category_id,
        subcategory_id: expense.subcategory_id || null,
        amount: expense.amount,
        description: expense.description,
        expense_date: expense.expense_date,
        notes: expense.notes,
        status: expense.status || 'submitted'
      }])
      .select(`
        *,
        category:expense_categories(*),
        subcategory:expense_subcategories(*)
      `)
      .single();

    if (error) {
      console.error("Error creating expense:", error);
      throw error;
    }

    // Send notification if expense is created with 'submitted' status
    // This applies to both employees and admins - all submitted expenses need approval
    if (data.status === 'submitted') {
      try {
        await sendExpenseNotification('expense_submitted', data.id);
      } catch (notificationError) {
        console.error('Failed to send expense notification:', notificationError);
        // Don't throw here - expense creation should succeed even if notification fails
      }
    }

    return data;
  } catch (error) {
    console.error("Error in createExpense:", error);
    throw error;
  }
};

// Update expense
export const updateExpense = async (expenseId: string, updates: Partial<Expense>): Promise<Expense> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .update({
        category_id: updates.category_id,
        subcategory_id: updates.subcategory_id || null,
        amount: updates.amount,
        description: updates.description,
        expense_date: updates.expense_date,
        notes: updates.notes,
        status: updates.status,
        submitted_at: updates.submitted_at,
        approved_at: updates.approved_at,
        approved_by: updates.approved_by,
        rejection_reason: updates.rejection_reason
      })
      .eq("id", expenseId)
      .select(`
        *,
        category:expense_categories(*),
        subcategory:expense_subcategories(*)
      `)
      .single();

    if (error) {
      console.error("Error updating expense:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateExpense:", error);
    throw error;
  }
};

// Delete expense
export const deleteExpense = async (expenseId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      console.error("Error deleting expense:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteExpense:", error);
    throw error;
  }
};

// Submit expense for approval
export const submitExpense = async (expenseId: string): Promise<Expense> => {
  const result = await updateExpense(expenseId, {
    status: 'submitted',
    submitted_at: new Date().toISOString()
  });

  // Send notification email to admins
  try {
    await sendExpenseNotification('expense_submitted', expenseId);
  } catch (error) {
    console.error('Failed to send submission notification:', error);
  }

  return result;
};

// Approve expense (admin only)
export const approveExpense = async (expenseId: string, approverId: string, notes?: string): Promise<Expense> => {
  const result = await updateExpense(expenseId, {
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: approverId,
    notes: notes ? `${notes}\n\n[Previous notes: ${await getExpenseNotes(expenseId)}]` : undefined
  });

  // Send notification email
  try {
    await sendExpenseNotification('expense_approved', expenseId);
  } catch (error) {
    console.error('Failed to send approval notification:', error);
  }

  return result;
};

// Reject expense (admin only)
export const rejectExpense = async (expenseId: string, approverId: string, reason: string, notes?: string): Promise<Expense> => {
  const result = await updateExpense(expenseId, {
    status: 'rejected',
    approved_by: approverId,
    rejection_reason: reason,
    notes: notes ? `${notes}\n\n[Previous notes: ${await getExpenseNotes(expenseId)}]` : undefined
  });

  // Send notification email
  try {
    await sendExpenseNotification('expense_rejected', expenseId);
  } catch (error) {
    console.error('Failed to send rejection notification:', error);
  }

  return result;
};

// Helper function to get existing notes
const getExpenseNotes = async (expenseId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("notes")
      .eq("id", expenseId)
      .single();
    
    if (error) return "";
    return data?.notes || "";
  } catch {
    return "";
  }
};

// Get expense statistics for admin dashboard
export const getExpenseStatistics = async (startDate?: string, endDate?: string) => {
  try {
    let query = supabase
      .from("expenses")
      .select(`
        id,
        amount,
        status,
        expense_date,
        user_id,
        category:expense_categories(name),
        user_name:profiles!expenses_user_id_fkey(full_name)
      `);

    if (startDate) {
      query = query.gte("expense_date", startDate);
    }
    if (endDate) {
      query = query.lte("expense_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching expense statistics:", error);
      throw error;
    }

    const stats = {
      totalAmount: data?.reduce((sum, expense) => sum + expense.amount, 0) || 0,
      totalCount: data?.length || 0,
      byStatus: {
        draft: data?.filter(e => e.status === 'draft').length || 0,
        submitted: data?.filter(e => e.status === 'submitted').length || 0,
        approved: data?.filter(e => e.status === 'approved').length || 0,
        rejected: data?.filter(e => e.status === 'rejected').length || 0,
      },
      byCategory: data?.reduce((acc, expense) => {
        const category = expense.category?.[0]?.name || 'Unknown';
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>) || {},
      byUser: data?.reduce((acc, expense) => {
        const user = expense.user_name?.[0]?.full_name || 'Unknown User';
        acc[user] = (acc[user] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>) || {},
      approvedAmount: data?.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0) || 0,
      pendingAmount: data?.filter(e => e.status === 'submitted').reduce((sum, e) => sum + e.amount, 0) || 0,
    };

    return stats;
  } catch (error) {
    console.error("Error in getExpenseStatistics:", error);
    throw error;
  }
};

// Upload receipt file - stores file path (not URL) for on-demand signed URL generation
export const uploadReceiptFile = async (file: File, userId: string): Promise<string> => {
  console.log("Starting file upload for user:", userId, "file:", file.name);
  
  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File size exceeds 10MB limit");
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.");
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `receipt-${Date.now()}.${fileExt}`;
    // Use user-based folder structure that matches storage policy expectations
    const filePath = `${userId}/${fileName}`;
    
    console.log("Uploading file to path:", filePath);

    const { data, error } = await supabase.storage
      .from('expense-receipts')
      .upload(filePath, file);

    if (error) {
      console.error("Storage upload error:", error);
      if (error.message.includes('policy')) {
        throw new Error("You don't have permission to upload files. Please contact your administrator.");
      }
      throw error;
    }

    console.log("File uploaded successfully:", data);
    
    // Return the file path instead of signed URL
    // This allows generating fresh signed URLs on-demand when viewing
    return filePath;
  } catch (error) {
    console.error("Error uploading receipt file:", error);
    throw new Error(`Failed to upload receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Generate a signed URL for viewing a receipt
export const getReceiptSignedUrl = async (receiptPath: string): Promise<string | null> => {
  if (!receiptPath) return null;

  try {
    const { data, error } = await supabase.storage
      .from('expense-receipts')
      .createSignedUrl(receiptPath, 3600); // 1 hour expiry
      
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getReceiptSignedUrl:', error);
    return null;
  }
};

// Upload a file and save it to the expense_attachments table
export const uploadExpenseAttachment = async (
  file: File,
  userId: string,
  expenseId: string
): Promise<ExpenseAttachment> => {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File size exceeds 10MB limit");
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `receipt-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from('expense-receipts')
    .upload(filePath, file);

  if (storageError) {
    if (storageError.message.includes('policy')) {
      throw new Error("You don't have permission to upload files. Please contact your administrator.");
    }
    throw storageError;
  }

  const { data, error } = await supabase
    .from('expense_attachments')
    .insert([{
      expense_id: expenseId,
      file_name: file.name,
      file_url: filePath,
      file_type: file.type,
      file_size: file.size
    }])
    .select()
    .single();

  if (error) {
    console.error("Error saving attachment record:", error);
    throw error;
  }

  return data;
};

// Fetch expense attachments
export const fetchExpenseAttachments = async (expenseId: string): Promise<ExpenseAttachment[]> => {
  try {
    const { data, error } = await supabase
      .from("expense_attachments")
      .select("*")
      .eq("expense_id", expenseId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching expense attachments:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchExpenseAttachments:", error);
    throw error;
  }
};

// Send expense notification emails
export const sendExpenseNotification = async (
  type: 'expense_submitted' | 'expense_approved' | 'expense_rejected' | 'expense_reminder',
  expenseId: string,
  recipientEmail?: string,
  message?: string
): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-expense-notifications', {
      body: {
        type,
        expenseId,
        recipientEmail,
        message
      }
    });

    if (error) {
      console.error('Error sending expense notification:', error);
      throw error;
    }

    console.log('Expense notification sent successfully:', data);
  } catch (error) {
    console.error('Error in sendExpenseNotification:', error);
    throw error;
  }
};

// Advanced expense filtering and search
export const searchExpenses = async (filters: {
  search?: string;
  category?: string;
  status?: string;
  user?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}): Promise<Expense[]> => {
  try {
    let query = supabase
      .from("expenses")
      .select(`
        *,
        category:expense_categories(*),
        subcategory:expense_subcategories(*),
        user_name:profiles!expenses_user_id_fkey(full_name),
        approved_by_name:profiles!expenses_approved_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.user) {
      query = query.eq("user_id", filters.user);
    }

    if (filters.startDate) {
      query = query.gte("expense_date", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("expense_date", filters.endDate);
    }

    if (filters.minAmount) {
      query = query.gte("amount", filters.minAmount);
    }

    if (filters.maxAmount) {
      query = query.lte("amount", filters.maxAmount);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error searching expenses:", error);
      throw error;
    }

    // Apply text search filter client-side for better UX
    let results = data || [];
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      results = results.filter(expense => 
        expense.description?.toLowerCase().includes(searchTerm) ||
        expense.notes?.toLowerCase().includes(searchTerm) ||
        expense.category?.name?.toLowerCase().includes(searchTerm) ||
        expense.subcategory?.name?.toLowerCase().includes(searchTerm)
      );
    }

    return results;
  } catch (error) {
    console.error("Error in searchExpenses:", error);
    throw error;
  }
};

// Get expense audit trail
export const getExpenseAuditTrail = async (expenseId: string) => {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("entity_name", "Expense")
      .ilike("description", `%${expenseId}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching expense audit trail:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getExpenseAuditTrail:", error);
    throw error;
  }
};