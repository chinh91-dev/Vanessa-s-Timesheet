import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  usePortalRequestTypes,
  PortalRequestType,
} from "@/hooks/usePortalRequestTypes";
import {
  useUpdatePortalGroupRequestTypes,
  PortalGroup,
} from "@/hooks/usePortalGroups";
import { getLucideIcon } from "@/lib/icon-utils";

interface PortalGroupRequestTypesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: PortalGroup | null;
}

export default function PortalGroupRequestTypesDialog({
  open,
  onOpenChange,
  group,
}: PortalGroupRequestTypesDialogProps) {
  const { data: allRequestTypes } = usePortalRequestTypes();
  const updateRequestTypes = useUpdatePortalGroupRequestTypes();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (group?.request_types) {
      setSelectedIds(new Set(group.request_types));
    } else {
      setSelectedIds(new Set());
    }
  }, [group]);

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSave = async () => {
    if (!group) return;
    
    await updateRequestTypes.mutateAsync({
      groupId: group.id,
      requestTypeIds: Array.from(selectedIds),
    });
    
    onOpenChange(false);
  };

  // Filter and group request types
  const filteredTypes = allRequestTypes?.filter(
    (rt) =>
      rt.is_active &&
      (rt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rt.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const incidents = filteredTypes?.filter((rt) => rt.category === "Incidents") || [];
  const serviceRequests = filteredTypes?.filter((rt) => rt.category === "Service requests") || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Configure Request Types - {group?.name}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Select a request form"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Incidents Section */}
            {incidents.length > 0 && (
              <div>
                <div className="sticky top-0 bg-background py-2 border-b">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Incidents
                  </h3>
                </div>
                <div className="divide-y">
                  {incidents.map((rt) => (
                    <RequestTypeRow
                      key={rt.id}
                      type={rt}
                      checked={selectedIds.has(rt.id)}
                      onToggle={() => handleToggle(rt.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Service Requests Section */}
            {serviceRequests.length > 0 && (
              <div>
                <div className="sticky top-0 bg-background py-2 border-b">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Service requests
                  </h3>
                </div>
                <div className="divide-y">
                  {serviceRequests.map((rt) => (
                    <RequestTypeRow
                      key={rt.id}
                      type={rt}
                      checked={selectedIds.has(rt.id)}
                      onToggle={() => handleToggle(rt.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} request type{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateRequestTypes.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequestTypeRow({
  type,
  checked,
  onToggle,
}: {
  type: PortalRequestType;
  checked: boolean;
  onToggle: () => void;
}) {
  const IconComponent = getLucideIcon(type.icon);

  return (
    <div
      className="flex items-center gap-4 py-3 px-2 hover:bg-muted/50 cursor-pointer rounded-md"
      onClick={onToggle}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <div className="p-2 bg-muted rounded-lg shrink-0">
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{type.name}</div>
        <p className="text-sm text-muted-foreground truncate">
          {type.description || "No description"}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0">
        {type.group_count} group{type.group_count !== 1 ? "s" : ""}
      </Badge>
    </div>
  );
}
