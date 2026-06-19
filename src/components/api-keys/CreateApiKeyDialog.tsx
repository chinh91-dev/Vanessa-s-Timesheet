import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateApiKey, ALL_SCOPES, ROLE_SCOPES, useActiveProfiles, useUserRole } from "@/hooks/useApiKeys";
import { Plus, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CreateApiKeyDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const createMutation = useCreateApiKey();

  const { data: profiles } = useActiveProfiles();
  const { data: userRole } = useUserRole(assignedTo || null);

  // Scopes are derived from role, not editable
  useEffect(() => {
    if (userRole && ROLE_SCOPES[userRole]) {
      setSelectedScopes(ROLE_SCOPES[userRole]);
    } else {
      setSelectedScopes([]);
    }
  }, [userRole, assignedTo]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!assignedTo) {
      toast.error("Please select a user");
      return;
    }
    if (!selectedScopes.length) {
      toast.error("Select at least one scope");
      return;
    }

    const key = await createMutation.mutateAsync({
      name: name.trim(),
      scopes: selectedScopes,
      expires_at: expiresAt || null,
      assigned_to: assignedTo,
    });

    setGeneratedKey(key);
  };

  const handleClose = () => {
    setOpen(false);
    setName("");
    setAssignedTo("");
    setSelectedScopes([]);
    setExpiresAt("");
    setGeneratedKey(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {generatedKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy this key now. It won't be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                <code className="text-sm break-all flex-1 select-all">{generatedKey}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey);
                    toast.success("Key copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Store this key securely. You cannot retrieve it later.
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a key for external bots and agents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div>
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Automation Bot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label>Assigned User</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignedTo && userRole && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Role: <span className="font-medium capitalize">{userRole}</span> — scopes auto-filled
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Permissions (based on user role)</Label>
                {!assignedTo ? (
                  <p className="text-sm text-muted-foreground border rounded-lg p-3">
                    Select a user to see their permissions
                  </p>
                ) : assignedTo && !userRole ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 border rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    This user has no role assigned. No permissions available.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                    {ALL_SCOPES.filter((group) =>
                      group.scopes.some((scope) => selectedScopes.includes(scope))
                    ).map((group) => (
                      <div key={group.group}>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">
                          {group.group}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.scopes.map((scope) => (
                            <label
                              key={scope}
                              className="flex items-center gap-1.5 text-sm"
                            >
                              <Checkbox
                                checked={selectedScopes.includes(scope)}
                                disabled
                              />
                              {scope.split(":")[1]}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="expires">Expiry (optional)</Label>
                <Input
                  id="expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateApiKeyDialog;
