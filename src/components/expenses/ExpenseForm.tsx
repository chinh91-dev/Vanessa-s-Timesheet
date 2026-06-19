import React, { useState, useEffect } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Expense,
  ExpenseCategory,
  ExpenseSubcategory,
  fetchExpenseCategories,
  fetchExpenseSubcategories,
  createExpense,
  updateExpense,
  uploadExpenseAttachment
} from "@/lib/expense-service";
import { Upload, X, FileText } from "lucide-react";
import ReceiptViewButton from "@/components/expenses/ReceiptViewButton";

const expenseSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  subcategory_id: z.string().optional().transform(val => val === "" ? undefined : val),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  expense_date: z.string().min(1, "Date is required")
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  onSuccess: () => void;
  onCancel: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState(expense?.category_id || "");
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category_id: expense?.category_id || "",
      subcategory_id: expense?.subcategory_id || undefined,
      amount: expense?.amount || 0,
      description: expense?.description || "",
      expense_date: expense?.expense_date || todayLocalYMD()
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: fetchExpenseCategories
  });

  // Fetch subcategories for selected category
  const { data: subcategories = [] } = useQuery({
    queryKey: ["expense-subcategories", selectedCategoryId],
    queryFn: () => fetchExpenseSubcategories(selectedCategoryId),
    enabled: !!selectedCategoryId
  });

  useEffect(() => {
    if (expense?.category_id) {
      setSelectedCategoryId(expense.category_id);
    }
  }, [expense]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value);
    form.setValue("category_id", value);
    form.setValue("subcategory_id", undefined); // Reset subcategory when category changes
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024;
    const accepted: File[] = [];

    for (const file of files) {
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 5MB`,
          variant: "destructive"
        });
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} — only JPEG, PNG, GIF, and PDF allowed`,
          variant: "destructive"
        });
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length > 0) {
      setReceiptFiles(prev => [...prev, ...accepted]);
    }

    const fileInput = document.getElementById('receipt-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const removeFile = (index: number) => {
    setReceiptFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ExpenseFormData) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create expenses",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    console.log("=== Form Submission Started ===");
    console.log("Form data:", JSON.stringify(data, null, 2));
    console.log("Subcategory ID value:", data.subcategory_id);
    console.log("Subcategory ID type:", typeof data.subcategory_id);

    try {
      let savedExpense;

      if (!expense) {
        const expenseData: Partial<Expense> = {
          ...data,
          user_id: user.id,
        };

        savedExpense = await createExpense(expenseData);
      } else {
        const expenseData: Partial<Expense> = {
          ...data,
          user_id: user.id,
        };

        savedExpense = await updateExpense(expense.id, expenseData);
      }

      if (receiptFiles.length > 0 && savedExpense?.id) {
        let failures = 0;
        let lastErr: string | null = null;
        for (const file of receiptFiles) {
          try {
            await uploadExpenseAttachment(file, user.id, savedExpense.id);
          } catch (uploadError) {
            console.error("Attachment upload failed:", uploadError);
            failures++;
            lastErr = uploadError instanceof Error ? uploadError.message : String(uploadError);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["expense-attachments", savedExpense.id] });
        if (failures > 0) {
          toast({
            title: `${failures} attachment${failures > 1 ? "s" : ""} failed`,
            description: lastErr ?? "Could not upload receipt(s).",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: expense ? "Expense updated successfully" : "Expense created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error("=== Error Saving Expense ===");
      console.error("Error object:", error);
      console.error("Error type:", typeof error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      let errorMessage = "Failed to save expense";
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = "You don't have permission to upload files. Please contact your administrator.";
        } else if (error.message.includes('violates')) {
          errorMessage = "Invalid data format. Please check all fields and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log("=== Form Submission Ended ===");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{expense ? "Edit Expense" : "Create New Expense"}</CardTitle>
        <CardDescription>
          {expense ? "Update your expense details" : "Add a new expense entry"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={handleCategoryChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      disabled={!selectedCategoryId || subcategories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedCategoryId 
                              ? "Select category first" 
                              : subcategories.length === 0 
                              ? "No subcategories available" 
                              : "Select subcategory"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCategoryId && subcategories.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        This category has no subcategories
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the expense" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label htmlFor="receipt-file">Receipt Attachment</Label>
              <Input
                id="receipt-file"
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('receipt-file')?.click()}
                  className="flex items-center gap-2 w-fit"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Receipt</span>
                </Button>

                {receiptFiles.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {receiptFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted px-3 py-1 rounded w-fit max-w-full">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {expense?.id && (
                  <ReceiptViewButton
                    expenseId={expense.id}
                    variant="list"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a receipt (JPEG, PNG, GIF, PDF). Max size: 5MB
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : expense ? "Update Expense" : "Create Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;