
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface User {
  id: string;
  full_name?: string;
  email?: string;
}

interface ProjectAssigneeSelectorProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  disabled?: boolean;
  className?: string;
}

const ProjectAssigneeSelector: React.FC<ProjectAssigneeSelectorProps> = ({
  selectedUserIds,
  onSelectionChange,
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);

  // Fetch all users with proper error handling
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("is_active", true)
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Error fetching users:", error);
          throw error;
        }
        
        // Ensure we always return an array
        return (data || []) as User[];
      } catch (err) {
        console.error("Failed to fetch users:", err);
        throw err;
      }
    },
  });

  // Safely filter selected users with null checks
  const selectedUsers = Array.isArray(users) 
    ? users.filter(user => user && selectedUserIds.includes(user.id))
    : [];

  const handleSelect = (userId: string) => {
    if (!userId) return;
    
    const isSelected = selectedUserIds.includes(userId);
    if (isSelected) {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUserIds, userId]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (!userId) return;
    onSelectionChange(selectedUserIds.filter(id => id !== userId));
  };

  const formatUserName = (user: User) => {
    if (!user) return "Unknown User";
    return user.full_name || user.email || "Unknown User";
  };

  // Handle error state
  if (error) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={true}
        >
          Error loading users
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading users...
              </>
            ) : selectedUsers.length > 0 ? (
              `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} assigned`
            ) : (
              "Assign users to project..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList className="max-h-[250px]">
              <CommandEmpty>
                {isLoading ? "Loading users..." : "No users found."}
              </CommandEmpty>
              <CommandGroup>
                {Array.isArray(users) && users.map((user) => (
                  user && user.id ? (
                    <CommandItem
                      key={user.id}
                      onSelect={() => handleSelect(user.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedUserIds.includes(user.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{formatUserName(user)}</span>
                        {user.full_name && user.email && (
                          <span className="text-sm text-muted-foreground">{user.email}</span>
                        )}
                      </div>
                    </CommandItem>
                  ) : null
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="border rounded-md">
          <ScrollArea className="h-[120px]">
            <div className="flex flex-wrap gap-2 p-3">
              {selectedUsers.map((user) => (
                user && user.id ? (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                    {formatUserName(user)}
                    {!disabled && (
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveUser(user.id)}
                      />
                    )}
                  </Badge>
                ) : null
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default ProjectAssigneeSelector;
