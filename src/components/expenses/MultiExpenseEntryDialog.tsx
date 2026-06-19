import React, { useState, useEffect } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExpenseCategory,
  ExpenseSubcategory,
  fetchExpenseCategories,
  fetchExpenseSubcategories,
  createExpense,
  uploadExpenseAttachment
} from "@/lib/expense-service";
import { Plus, Trash2, Upload, X, FileText, Save, Loader2, Check, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ExpenseItem {
  id: string;
  category_id: string;
  subcategory_id?: string;
  amount: number;
  expense_date: string;
  description?: string;
  receiptFiles: File[];
}

interface MultiExpenseEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyItem = (): ExpenseItem => ({
  id: generateId(),
  category_id: "",
  subcategory_id: undefined,
  amount: 0,
  expense_date: todayLocalYMD(),
  description: "",
  receiptFiles: []
});

const MultiExpenseEntryDialog: React.FC<MultiExpenseEntryDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ExpenseItem[]>([createEmptyItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, ExpenseSubcategory[]>>({});
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: fetchExpenseCategories
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setItems([createEmptyItem()]);
      setSubcategoriesMap({});
      setCollapsedItems(new Set());
    }
  }, [open]);

  // Fetch subcategories for a category
  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId || subcategoriesMap[categoryId]) return;
    
    try {
      const subs = await fetchExpenseSubcategories(categoryId);
      setSubcategoriesMap(prev => ({ ...prev, [categoryId]: subs }));
    } catch (error) {
      console.error("Failed to load subcategories:", error);
    }
  };

  const addItem = () => {
    const newItem = createEmptyItem();
    setItems(prev => [...prev, newItem]);
    // New items are always expanded
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
    setCollapsedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const updateItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      // Reset subcategory when category changes
      if (field === 'category_id') {
        loadSubcategories(value);
        return { ...item, [field]: value, subcategory_id: undefined };
      }
      
      return { ...item, [field]: value };
    }));
  };

  const handleFileChange = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    if (!newFiles.length) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const invalid = newFiles.filter(f => !allowedTypes.includes(f.type));
    if (invalid.length) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, WebP, and PDF files are allowed",
        variant: "destructive"
      });
      return;
    }

    const oversized = newFiles.filter(f => f.size > 10 * 1024 * 1024);
    if (oversized.length) {
      toast({
        title: "File too large",
        description: "Each file must be smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    // Reset input so the same file can be added again if needed
    event.target.value = '';

    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, receiptFiles: [...item.receiptFiles, ...newFiles] };
    }));
  };

  const removeFile = (id: string, fileIndex: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = item.receiptFiles.filter((_, i) => i !== fileIndex);
      return { ...item, receiptFiles: updated };
    }));
  };

  const validateItem = (item: ExpenseItem, index: number, showToast: boolean = true): boolean => {
    if (!item.category_id) {
      if (showToast) {
        toast({
          title: "Validation Error",
          description: `Item ${index + 1}: Category is required`,
          variant: "destructive"
        });
      }
      return false;
    }
    if (!item.amount || item.amount <= 0) {
      if (showToast) {
        toast({
          title: "Validation Error",
          description: `Item ${index + 1}: Amount must be greater than 0`,
          variant: "destructive"
        });
      }
      return false;
    }
    if (!item.expense_date) {
      if (showToast) {
        toast({
          title: "Validation Error",
          description: `Item ${index + 1}: Date is required`,
          variant: "destructive"
        });
      }
      return false;
    }
    return true;
  };

  const validateItems = (): boolean => {
    for (let i = 0; i < items.length; i++) {
      if (!validateItem(items[i], i)) {
        return false;
      }
    }
    return true;
  };

  const toggleCollapse = (id: string) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDone = (id: string, index: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Validate before collapsing
    if (!validateItem(item, index)) {
      return;
    }

    // Collapse the item
    setCollapsedItems(prev => new Set([...prev, id]));
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-AU', { 
      style: 'currency', 
      currency: 'AUD',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  const isItemValid = (item: ExpenseItem): boolean => {
    return !!(item.category_id && item.amount > 0 && item.expense_date);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create expenses",
        variant: "destructive"
      });
      return;
    }

    if (!validateItems()) return;

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    let attachmentFailures = 0;
    let lastAttachmentError: string | null = null;

    try {
      for (const item of items) {
        try {
          const expenseData = {
            category_id: item.category_id,
            subcategory_id: item.subcategory_id || null,
            amount: item.amount,
            expense_date: item.expense_date,
            description: item.description || null,
            user_id: user.id,
          };

          const savedExpense = await createExpense(expenseData);

          if (item.receiptFiles.length > 0) {
            for (const file of item.receiptFiles) {
              try {
                await uploadExpenseAttachment(file, user.id, savedExpense.id);
              } catch (uploadError) {
                console.error("Attachment upload failed:", uploadError);
                attachmentFailures++;
                lastAttachmentError = uploadError instanceof Error ? uploadError.message : String(uploadError);
              }
            }
            queryClient.invalidateQueries({ queryKey: ["expense-attachments", savedExpense.id] });
          }

          successCount++;
        } catch (error) {
          console.error("Failed to create expense:", error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Successfully created ${successCount} expense${successCount > 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: "Failed to create any expenses. Please try again.",
          variant: "destructive"
        });
      }

      if (attachmentFailures > 0) {
        toast({
          title: `${attachmentFailures} receipt upload${attachmentFailures > 1 ? 's' : ''} failed`,
          description: lastAttachmentError ?? "Check storage permissions and try re-attaching.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  const readyItemsCount = items.filter(item => collapsedItems.has(item.id) && isItemValid(item)).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Add Expenses
            <Badge variant="secondary">{items.length} item{items.length > 1 ? 's' : ''}</Badge>
            {readyItemsCount > 0 && (
              <Badge variant="default" className="bg-green-600">
                {readyItemsCount} ready
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div 
          className="flex-1 min-h-0 overflow-y-auto pr-2" 
          style={{ maxHeight: 'calc(90vh - 180px)' }}
        >
          <div className="space-y-3">
            {items.map((item, index) => {
              const isCollapsed = collapsedItems.has(item.id);
              const isValid = isItemValid(item);

              return (
                <Card 
                  key={item.id} 
                  className={cn(
                    "relative transition-all",
                    isCollapsed && isValid && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
                  )}
                >
                  {isCollapsed ? (
                    // Collapsed summary view
                    <div 
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCollapse(item.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <Check className="h-3 w-3 mr-1" />
                              #{index + 1}
                            </Badge>
                          </div>
                          <span className="font-medium">{getCategoryName(item.category_id)}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-semibold text-primary">{formatAmount(item.amount)}</span>
                          {item.receiptFiles.length > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{item.receiptFiles.length}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(item.id);
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                            Edit
                          </Button>
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(item.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Expanded form view
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">Item {index + 1}</Badge>
                        <div className="flex items-center gap-2">
                          {isValid && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDone(item.id, index)}
                              className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Done
                            </Button>
                          )}
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="space-y-2">
                          <Label>Category *</Label>
                          <Select
                            value={item.category_id}
                            onValueChange={(value) => updateItem(item.id, 'category_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subcategory */}
                        <div className="space-y-2">
                          <Label>Subcategory</Label>
                          <Select
                            value={item.subcategory_id || ""}
                            onValueChange={(value) => updateItem(item.id, 'subcategory_id', value || undefined)}
                            disabled={!item.category_id || !subcategoriesMap[item.category_id]?.length}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !item.category_id 
                                  ? "Select category first" 
                                  : !subcategoriesMap[item.category_id]?.length 
                                  ? "No subcategories" 
                                  : "Select subcategory"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {(subcategoriesMap[item.category_id] || []).map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount || ''}
                            onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Date */}
                        <div className="space-y-2">
                          <Label>Date *</Label>
                          <Input
                            type="date"
                            value={item.expense_date}
                            onChange={(e) => updateItem(item.id, 'expense_date', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2 mt-4">
                        <Label>Description</Label>
                        <Input
                          placeholder="Brief description of the expense"
                          value={item.description || ''}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        />
                      </div>

                      {/* Attachments */}
                      <div className="space-y-2 mt-4">
                        <Label>Attachments</Label>
                        <div className="space-y-2">
                          <Input
                            id={`receipt-${item.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            multiple
                            onChange={(e) => handleFileChange(item.id, e)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`receipt-${item.id}`)?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Add Files
                          </Button>

                          {item.receiptFiles.length > 0 && (
                            <div className="flex flex-col gap-1">
                              {item.receiptFiles.map((file, fileIndex) => (
                                <div key={fileIndex} className="flex items-center gap-2 bg-muted px-3 py-1 rounded">
                                  <FileText className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-sm truncate flex-1">{file.name}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {(file.size / 1024).toFixed(0)} KB
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={() => removeFile(item.id, fileIndex)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            disabled={isSubmitting}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Item
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save {items.length} Expense{items.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiExpenseEntryDialog;
