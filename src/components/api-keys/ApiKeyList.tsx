import React, { useState } from "react";
import { useApiKeys, useToggleApiKey, useDeleteApiKey, useRenameApiKey, type ApiKey } from "@/hooks/useApiKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Copy, User, AlertTriangle, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ApiKeyList = () => {
  const { data: keys, isLoading } = useApiKeys();
  const toggleMutation = useToggleApiKey();
  const deleteMutation = useDeleteApiKey();
  const renameMutation = useRenameApiKey();

  const [renameTarget, setRenameTarget] = useState<ApiKey | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const openRename = (key: ApiKey) => {
    setRenameTarget(key);
    setRenameValue(key.name);
  };

  const closeRename = () => {
    setRenameTarget(null);
    setRenameValue("");
  };

  const submitRename = () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }
    if (trimmed === renameTarget.name) {
      closeRename();
      return;
    }
    renameMutation.mutate(
      { id: renameTarget.id, name: trimmed },
      { onSuccess: closeRename }
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm py-8 text-center">Loading keys...</div>;
  }

  if (!keys?.length) {
    return (
      <div className="text-muted-foreground text-sm py-8 text-center">
        No API keys yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {keys.map((key) => (
        <div
          key={key.id}
          className="flex items-center justify-between p-4 border rounded-lg bg-card"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground">{key.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => openRename(key)}
                title="Rename"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Badge variant={key.is_active ? "default" : "secondary"}>
                {key.is_active ? "Active" : "Disabled"}
              </Badge>
              {key.has_stale_scopes && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Stale Scopes
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This key has scopes that exceed the user's current role permissions. They will be ignored at runtime.</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {key.assigned_profile && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <User className="h-3.5 w-3.5" />
                <span>{key.assigned_profile.full_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{key.key_prefix}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  navigator.clipboard.writeText(key.key_prefix);
                  toast.success("Prefix copied");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {key.scopes.slice(0, 4).map((scope) => (
                <Badge key={scope} variant="outline" className="text-xs">
                  {scope}
                </Badge>
              ))}
              {key.scopes.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{key.scopes.length - 4} more
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Created {format(new Date(key.created_at), "MMM d, yyyy")}
              {key.last_used_at && (
                <> · Last used {format(new Date(key.last_used_at), "MMM d, yyyy HH:mm")}</>
              )}
              {key.expires_at && (
                <> · Expires {format(new Date(key.expires_at), "MMM d, yyyy")}</>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Switch
              checked={key.is_active}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ id: key.id, is_active: checked })
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{key.name}". Any bots using this key will lose access.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(key.id)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && closeRename()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename API Key</DialogTitle>
            <DialogDescription>
              Update the display name for this API key. The key value itself will not change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="api-key-rename">Name</Label>
            <Input
              id="api-key-rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRename} disabled={renameMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={renameMutation.isPending}>
              {renameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeyList;
