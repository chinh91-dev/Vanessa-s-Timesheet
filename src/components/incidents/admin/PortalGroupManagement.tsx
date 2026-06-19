import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Settings2, X } from "lucide-react";
import {
  usePortalGroups,
  useDeletePortalGroup,
  PortalGroup,
} from "@/hooks/usePortalGroups";
import { usePortalRequestTypes } from "@/hooks/usePortalRequestTypes";
import PortalGroupDialog from "./PortalGroupDialog";
import PortalGroupRequestTypesDialog from "./PortalGroupRequestTypesDialog";
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
import CustomerSelector from "@/components/customers/CustomerSelector";

export default function PortalGroupManagement() {
  const { data: portalGroups, isLoading } = usePortalGroups(); // Fetch ALL groups
  const { data: requestTypes } = usePortalRequestTypes();
  const deletePortalGroup = useDeletePortalGroup();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PortalGroup | null>(null);
  const [requestTypesDialogOpen, setRequestTypesDialogOpen] = useState(false);
  const [configuringGroup, setConfiguringGroup] = useState<PortalGroup | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [prefilledCustomerId, setPrefilledCustomerId] = useState<string | null>(null);

  // Create lookup map for request type names
  const requestTypeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    requestTypes?.forEach(rt => map.set(rt.id, rt.name));
    return map;
  }, [requestTypes]);

  // Group portal groups by customer (filtered if customer selected)
  const groupedByCustomer = useMemo(() => {
    if (!portalGroups) return {};
    
    // Filter by selected customer if set
    const filteredGroups = selectedCustomerId 
      ? portalGroups.filter(g => g.customer_id === selectedCustomerId)
      : portalGroups;
    
    const grouped: Record<string, { customerName: string; groups: PortalGroup[] }> = {};
    
    filteredGroups.forEach((group) => {
      const customerId = group.customer_id || "unknown";
      const customerName = group.customer?.name || "Unknown Customer";
      
      if (!grouped[customerId]) {
        grouped[customerId] = { customerName, groups: [] };
      }
      grouped[customerId].groups.push(group);
    });
    
    return grouped;
  }, [portalGroups, selectedCustomerId]);

  const handleEdit = (group: PortalGroup) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingGroup(null);
    setPrefilledCustomerId(null);
    setDialogOpen(true);
  };

  const handleCreateForCustomer = (customerId: string) => {
    setEditingGroup(null);
    setPrefilledCustomerId(customerId);
    setDialogOpen(true);
  };

  const handleConfigureRequestTypes = (group: PortalGroup) => {
    setConfiguringGroup(group);
    setRequestTypesDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deletePortalGroup.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const customerEntries = Object.entries(groupedByCustomer).sort((a, b) => 
    a[1].customerName.localeCompare(b[1].customerName)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Portal Groups</h2>
          <p className="text-sm text-muted-foreground">
            Configure portal groups for each customer
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <CustomerSelector
              selectedCustomerId={selectedCustomerId || ""}
              onSelectCustomer={(id) => setSelectedCustomerId(id || null)}
              containerClassName="w-full sm:w-[200px]"
            />
            {selectedCustomerId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCustomerId(null)}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Portal Group
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : customerEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No portal groups configured yet.
            <br />
            <Button variant="link" onClick={handleCreate} className="mt-2">
              Create the first portal group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {customerEntries.map(([customerId, { customerName, groups }]) => (
            <div key={customerId} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-base font-medium text-foreground">
                  {customerName}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCreateForCustomer(customerId)}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Group
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <PortalGroupCard
                    key={group.id}
                    group={group}
                    onEdit={handleEdit}
                    onDelete={() => setDeleteConfirmId(group.id)}
                    onConfigureRequestTypes={handleConfigureRequestTypes}
                    requestTypeNameMap={requestTypeNameMap}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PortalGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingGroup={editingGroup}
        defaultCustomerId={prefilledCustomerId || undefined}
      />

      <PortalGroupRequestTypesDialog
        open={requestTypesDialogOpen}
        onOpenChange={setRequestTypesDialogOpen}
        group={configuringGroup}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portal Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this portal group? This action cannot be undone.
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

function PortalGroupCard({
  group,
  onEdit,
  onDelete,
  onConfigureRequestTypes,
  requestTypeNameMap,
}: {
  group: PortalGroup;
  onEdit: (group: PortalGroup) => void;
  onDelete: () => void;
  onConfigureRequestTypes: (group: PortalGroup) => void;
  requestTypeNameMap: Map<string, string>;
}) {
  const IconComponent = getLucideIcon(group.icon);
  const requestTypeCount = group.request_types?.length || 0;

  // Auto-generate description from assigned request type names
  const autoDescription = useMemo(() => {
    if (!group.request_types || group.request_types.length === 0) {
      return "No request types assigned";
    }
    return group.request_types
      .map(id => requestTypeNameMap.get(id))
      .filter(Boolean)
      .join(", ");
  }, [group.request_types, requestTypeNameMap]);

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{group.name}</CardTitle>
              {!group.is_active && (
                <Badge variant="secondary" className="text-xs mt-1">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {autoDescription}
        </p>
        
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            {requestTypeCount} request type{requestTypeCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onConfigureRequestTypes(group)}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Configure
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(group)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
