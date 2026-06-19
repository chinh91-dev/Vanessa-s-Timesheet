import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Star,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  CustomerLiaison,
  fetchCustomerLiaisons,
  saveLiaison,
  deleteLiaison,
  setPrimaryLiaison,
} from "@/lib/customer-service";
import CustomerLiaisonForm from "./CustomerLiaisonForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomerLiaisonListProps {
  customerId: string;
}

interface LiaisonFormValues {
  name: string;
  title: string;
  email: string;
  phone: string;
}

const CustomerLiaisonList: React.FC<CustomerLiaisonListProps> = ({
  customerId,
}) => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLiaison, setEditingLiaison] = useState<CustomerLiaison | null>(null);
  const [deletingLiaison, setDeletingLiaison] = useState<CustomerLiaison | null>(null);

  // Fetch liaisons
  const { data: liaisons = [], isLoading } = useQuery({
    queryKey: ["customer-liaisons", customerId],
    queryFn: () => fetchCustomerLiaisons(customerId),
    enabled: !!customerId,
  });

  // Save liaison mutation
  const saveMutation = useMutation({
    mutationFn: async (data: LiaisonFormValues) => {
      return saveLiaison({
        id: editingLiaison?.id,
        customer_id: customerId,
        name: data.name,
        title: data.title || null,
        email: data.email || null,
        phone: data.phone || null,
        is_primary: editingLiaison?.is_primary || liaisons.length === 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-liaisons", customerId] });
      toast({
        title: editingLiaison ? "Liaison updated" : "Liaison added",
        description: editingLiaison
          ? "The liaison has been updated successfully."
          : "New liaison has been added successfully.",
      });
      setIsFormOpen(false);
      setEditingLiaison(null);
    },
    onError: (error) => {
      console.error("Error saving liaison:", error);
      toast({
        title: "Error",
        description: "Failed to save liaison. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete liaison mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLiaison,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-liaisons", customerId] });
      toast({
        title: "Liaison deleted",
        description: "The liaison has been removed.",
      });
      setDeletingLiaison(null);
    },
    onError: (error) => {
      console.error("Error deleting liaison:", error);
      toast({
        title: "Error",
        description: "Failed to delete liaison. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (liaisonId: string) => setPrimaryLiaison(customerId, liaisonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-liaisons", customerId] });
      toast({
        title: "Primary liaison updated",
        description: "The primary liaison has been changed.",
      });
    },
    onError: (error) => {
      console.error("Error setting primary liaison:", error);
      toast({
        title: "Error",
        description: "Failed to set primary liaison. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddNew = () => {
    setEditingLiaison(null);
    setIsFormOpen(true);
  };

  const handleEdit = (liaison: CustomerLiaison) => {
    setEditingLiaison(liaison);
    setIsFormOpen(true);
  };

  const handleSave = (data: LiaisonFormValues) => {
    saveMutation.mutate(data);
  };

  const handleDelete = (liaison: CustomerLiaison) => {
    setDeletingLiaison(liaison);
  };

  const confirmDelete = () => {
    if (deletingLiaison) {
      deleteMutation.mutate(deletingLiaison.id);
    }
  };

  const handleSetPrimary = (liaison: CustomerLiaison) => {
    if (!liaison.is_primary) {
      setPrimaryMutation.mutate(liaison.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Liaisons</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddNew}
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {liaisons.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No liaisons added yet.
        </p>
      ) : (
        <div className="space-y-2">
          {liaisons.map((liaison) => (
            <div
              key={liaison.id}
              className="flex items-start justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {liaison.name}
                  </span>
                  {liaison.is_primary && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Primary
                    </Badge>
                  )}
                </div>
                {liaison.title && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {liaison.title}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {liaison.email && (
                    <a
                      href={`mailto:${liaison.email}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {liaison.email}
                    </a>
                  )}
                  {liaison.phone && (
                    <a
                      href={`tel:${liaison.phone}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {liaison.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {!liaison.is_primary && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleSetPrimary(liaison)}
                    disabled={setPrimaryMutation.isPending}
                    title="Set as primary"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleEdit(liaison)}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(liaison)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Dialog */}
      <CustomerLiaisonForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLiaison(null);
        }}
        onSave={handleSave}
        existingLiaison={editingLiaison}
        isPending={saveMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingLiaison}
        onOpenChange={(open) => !open && setDeletingLiaison(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Liaison</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLiaison?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerLiaisonList;
