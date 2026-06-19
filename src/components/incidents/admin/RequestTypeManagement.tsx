import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  usePortalRequestTypes,
  useDeletePortalRequestType,
  PortalRequestType,
} from "@/hooks/usePortalRequestTypes";
import RequestTypeDialog from "./RequestTypeDialog";
import { getLucideIcon } from "@/lib/icon-utils";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function RequestTypeManagement() {
  const { data: requestTypes, isLoading } = usePortalRequestTypes();
  const deleteRequestType = useDeletePortalRequestType();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PortalRequestType | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (type: PortalRequestType) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteRequestType.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Group by category and assignment status
  const incidents = requestTypes?.filter((rt) => rt.category === "Incidents" && rt.group_count > 0) || [];
  const serviceRequests = requestTypes?.filter((rt) => rt.category === "Service requests" && rt.group_count > 0) || [];
  const unassigned = requestTypes?.filter((rt) => rt.group_count === 0) || [];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Request types</h2>
          <p className="text-sm text-muted-foreground">
            Define the types of requests customers can submit
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add request type
        </Button>
      </div>

      <div className="space-y-6">
        {/* Incidents Section */}
        {incidents.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Incidents</h3>
            <div className="border rounded-lg divide-y">
              {incidents.map((type) => (
                <RequestTypeRow
                  key={type.id}
                  type={type}
                  onEdit={handleEdit}
                  onDelete={() => setDeleteConfirmId(type.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Service Requests Section */}
        {serviceRequests.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Service requests</h3>
            <div className="border rounded-lg divide-y">
              {serviceRequests.map((type) => (
                <RequestTypeRow
                  key={type.id}
                  type={type}
                  onEdit={handleEdit}
                  onDelete={() => setDeleteConfirmId(type.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unassigned Section */}
        {unassigned.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Unassigned</h3>
            <div className="border rounded-lg divide-y">
              {unassigned.map((type) => (
                <RequestTypeRow
                  key={type.id}
                  type={type}
                  onEdit={handleEdit}
                  onDelete={() => setDeleteConfirmId(type.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <RequestTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingType={editingType}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request type? This will also remove it from all portal groups.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RequestTypeRow({
  type,
  onEdit,
  onDelete,
}: {
  type: PortalRequestType;
  onEdit: (type: PortalRequestType) => void;
  onDelete: () => void;
}) {
  const IconComponent = getLucideIcon(type.icon);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer"
          onClick={() => onEdit(type)}
        >
          <div className="p-1.5 bg-muted rounded">
            <IconComponent className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{type.name}</span>
              {!type.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          {type.group_count > 0 && (
            <Badge variant="secondary" className="rounded-full text-xs font-normal">
              {type.group_count} {type.group_count === 1 ? "group" : "groups"}
            </Badge>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(type)}>
          Edit
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
