
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Check, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchUsers, User as UserType } from "@/lib/user-service";
import { useAuth } from "@/context/AuthContext";

interface UserSelectorProps {
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  className?: string;
}

const UserSelector: React.FC<UserSelectorProps> = ({
  selectedUserId,
  onSelectUser,
  className
}) => {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(false)
  });

  const selectedUser = users.find(u => u.id === selectedUserId);
  const displayName = selectedUser?.full_name || selectedUser?.email || "Select user";

  const getInitials = (user: UserType) => {
    if (user.full_name) {
      return user.full_name
        .split(" ")
        .map(name => name.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.charAt(0).toUpperCase() || "U";
  };

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId === "current" ? null : userId);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-sm">
        <div className="h-10 bg-muted rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start h-10 px-3"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {selectedUser ? getInitials(selectedUser) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium truncate">
                  {selectedUserId ? displayName : `My Timesheet`}
                </span>
                {selectedUser?.employee_id && (
                  <span className="text-xs text-muted-foreground">
                    ID: {selectedUser.employee_id}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." className="h-9" />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {/* Current user option */}
                <CommandItem
                  value="current"
                  onSelect={() => handleSelectUser("current")}
                  className="flex items-center gap-2 p-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !selectedUserId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      ME
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      View My Timesheet
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Your own timesheet
                    </span>
                  </div>
                </CommandItem>
                
                {/* Other users */}
                {users
                  .filter(user => user.id !== currentUser?.id)
                  .map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.full_name} ${user.email} ${user.employee_id || ""}`}
                      onSelect={() => handleSelectUser(user.id)}
                      className="flex items-center gap-2 p-2"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedUserId === user.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.full_name || user.email}
                        </span>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          {user.email && user.full_name && (
                            <span>{user.email}</span>
                          )}
                          {user.employee_id && (
                            <span>ID: {user.employee_id}</span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default UserSelector;
