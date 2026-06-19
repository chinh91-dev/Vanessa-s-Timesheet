import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeviceUser {
  id: string;
  name: string;
  email: string | null;
}

interface DeviceUserComboboxProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  allowCreate?: boolean;
  className?: string;
}

export function DeviceUserCombobox({
  value,
  onChange,
  placeholder = "Select user...",
  allowCreate = true,
  className,
}: DeviceUserComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<DeviceUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DeviceUser | null>(null);

  // Load users on mount and when search changes
  useEffect(() => {
    loadUsers();
  }, [searchTerm]);

  // Load selected user details if value is set
  useEffect(() => {
    if (value && !selectedUser) {
      loadSelectedUser(value);
    } else if (!value) {
      setSelectedUser(null);
    }
  }, [value]);

  const loadSelectedUser = async (userId: string) => {
    const { data } = await supabase
      .from("device_users")
      .select("id, name, email")
      .eq("id", userId)
      .maybeSingle();
    if (data) setSelectedUser(data);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("device_users")
        .select("id, name, email")
        .order("name")
        .limit(50);

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Failed to load device users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!searchTerm.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("device_users")
        .insert({ name: searchTerm.trim() })
        .select("id, name, email")
        .single();

      if (error) throw error;

      setSelectedUser(data);
      onChange(data.id);
      setOpen(false);
      setSearchTerm("");
      toast.success(`Created device user "${data.name}"`);
      await loadUsers();
    } catch (error: any) {
      console.error("Failed to create device user:", error);
      toast.error(error?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (userId: string) => {
    if (userId === value) {
      onChange(undefined);
      setSelectedUser(null);
    } else {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setSelectedUser(user);
        onChange(user.id);
      }
    }
    setOpen(false);
  };

  const showCreateOption =
    allowCreate &&
    searchTerm.trim() &&
    !users.some(
      (u) => u.name.toLowerCase() === searchTerm.trim().toLowerCase()
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selectedUser ? (
            <span className="flex items-center gap-2 truncate">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {selectedUser.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type new name..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {users.length === 0 && !showCreateOption && (
                  <CommandEmpty>No users found.</CommandEmpty>
                )}
                <CommandGroup>
                  {users.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => handleSelect(user.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === user.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        {user.email && (
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {showCreateOption && (
                  <CommandGroup heading="Create new">
                    <CommandItem onSelect={handleCreate} disabled={creating}>
                      {creating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Create "{searchTerm.trim()}"
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
