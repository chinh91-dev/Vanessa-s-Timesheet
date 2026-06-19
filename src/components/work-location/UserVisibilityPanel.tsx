import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Eye, EyeOff } from "lucide-react";
import { fetchUsersWithWorkSchedules, type User } from "@/lib/user-service";
import { useToast } from "@/hooks/use-toast";

interface UserVisibilityPanelProps {
  selectedUsers: string[];
  onUsersChange: (userIds: string[]) => void;
}

const UserVisibilityPanel: React.FC<UserVisibilityPanelProps> = ({
  selectedUsers,
  onUsersChange
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const fetchedUsers = await fetchUsersWithWorkSchedules();
      setUsers(fetchedUsers);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users with work schedules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      onUsersChange([...selectedUsers, userId]);
    } else {
      onUsersChange(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleSelectAll = () => {
    onUsersChange(users.map(user => user.id));
  };

  const handleSelectNone = () => {
    onUsersChange([]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="w-full ml-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="w-24 h-4 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full ml-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectNone}
            className="flex-1"
          >
            <EyeOff className="h-3 w-3 mr-1" />
            None
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
          {users.map(user => (
            <div key={user.id} className="flex items-center space-x-3">
              <Checkbox
                id={`user-${user.id}`}
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={(checked) => 
                  handleUserToggle(user.id, checked as boolean)
                }
              />
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {getInitials(user.full_name || user.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor={`user-${user.id}`}
                className="text-sm font-medium cursor-pointer flex-1 truncate"
              >
                {user.full_name || user.email}
              </label>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {selectedUsers.length} of {users.length} members visible
            <div className="mt-1 text-xs opacity-70">
              (Only showing members with configured work schedules)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserVisibilityPanel;