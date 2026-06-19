import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers, UserWithRole, deleteUser, updateUser, deactivateUser, reactivateUser } from "@/lib/user-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Edit, 
  Trash2, 
  Clock, 
  Mail, 
  Building2, 
  CreditCard, 
  User as UserIcon,
  Globe,
  UserMinus,
  UserCheck,
  KeyRound,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import AddEditUserDialog from "./AddEditUserDialog";
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
import { useAuth } from "@/context/AuthContext";

const TeamList: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<UserWithRole | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState<string | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users", showInactive],
    queryFn: () => {
      console.log("🔍 TeamList: Fetching users with showInactive =", showInactive);
      return fetchUsers(showInactive);
    },
    staleTime: 0, // Always refetch when query key changes
    enabled: true, // Always enable the query
  });

  const handleEditUser = useCallback((user: UserWithRole) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      toast({
        title: "User deleted",
        description: `${userToDelete.full_name || userToDelete.email} has been permanently removed.`,
      });
      refetch();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  }, [userToDelete, refetch]);

  const handleDeactivateUser = useCallback(async () => {
    if (!userToDeactivate) return;
    
    setIsDeactivating(true);
    try {
      await deactivateUser(userToDeactivate.id, deactivationReason);
      toast({
        title: "User deactivated",
        description: `${userToDeactivate.full_name || userToDeactivate.email} has been deactivated.`,
      });
      refetch();
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast({
        title: "Error deactivating user",
        description: "Failed to deactivate user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeactivating(false);
      setUserToDeactivate(null);
      setDeactivationReason("");
    }
  }, [userToDeactivate, deactivationReason, refetch]);

  const handleReactivateUser = useCallback(async (user: UserWithRole) => {
    try {
      await reactivateUser(user.id);

      // Send password reset email so the user can set a new password on their first login
      if (user.email) {
        const redirectUrl = `${window.location.origin}/reset-password`;
        await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: redirectUrl,
        });
      }

      toast({
        title: "User reactivated",
        description: `${user.full_name || user.email} has been reactivated and a password reset email has been sent.`,
      });
      refetch();
    } catch (error) {
      console.error("Error reactivating user:", error);
      toast({
        title: "Error reactivating user",
        description: "Failed to reactivate user. Please try again.",
        variant: "destructive",
      });
    }
  }, [refetch]);

  const handleSendPasswordReset = useCallback(async (user: UserWithRole) => {
    if (!user.email) {
      toast({
        title: "Cannot send reset email",
        description: "User does not have an email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingReset(user.id);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: `A reset link has been sent to ${user.email}`,
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error sending reset email",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(null);
    }
  }, []);

  const handleManageTimesheet = useCallback((userId: string) => {
    // Navigate to timesheet page with user selection
    navigate(`/timesheet?userId=${userId}`);
  }, [navigate]);

  const handleUserSaved = useCallback(async (userData: UserWithRole) => {
    if (!editingUser) return;
    
    setIsUpdating(true);
    try {
      await updateUser(userData);
      toast({
        title: "User updated",
        description: `${userData.full_name || userData.email} has been updated successfully.`,
      });
      refetch();
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error updating user",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [editingUser, refetch]);

  const getInitials = (user: UserWithRole) => {
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "employee":
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading team members...</div>;
  }

  return (
    <TooltipProvider>
      {userRole === 'admin' && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 pl-4 pt-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={(checked) => {
                console.log("🔄 TeamList: Toggle changed to", checked);
                setShowInactive(checked);
              }}
            />
            <Label htmlFor="show-inactive">
              Show inactive users ({users.filter(u => !u.is_active).length})
            </Label>
          </div>
          {isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse">
              Loading users...
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {users.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {showInactive ? "No users found (including inactive)" : "No active users found"}
          </div>
        )}
        {users.map((user) => {
          console.log("👤 Rendering user:", user.full_name, "is_active:", user.is_active);
          return (
          <Card key={user.id} className={`hover:shadow-lg transition-shadow duration-200 ${!user.is_active ? 'opacity-60 border-orange-200' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={`${user.is_active ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'} font-semibold`}>
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">
                    {user.full_name || "Unnamed User"}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={getRoleBadgeVariant(user.role || "employee")}>
                      {(user.role || "employee").charAt(0).toUpperCase() + (user.role || "employee").slice(1)}
                    </Badge>
                    {user.employment_type && (
                      <Badge variant="outline" className="text-xs">
                        {user.employment_type.replace("-", " ")}
                      </Badge>
                    )}
                    {!user.is_active && (
                      <Badge variant="destructive" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              
              {user.organization && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{user.organization}</span>
                </div>
              )}

              {user.employee_id && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <UserIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>ID: {user.employee_id}</span>
                </div>
              )}

              {user.employee_card_id && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Card: {user.employee_card_id}</span>
                </div>
              )}

              {user.time_zone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{user.time_zone}</span>
                </div>
              )}

              {!user.is_active && user.deactivation_reason && (
                <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                  <strong>Reason:</strong> {user.deactivation_reason}
                </div>
              )}

              <div className="space-y-3 pt-2">
                {/* Primary Actions Row */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    className="flex-1"
                    disabled={!user.is_active && userRole !== 'admin'}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {user.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageTimesheet(user.id)}
                      className="flex-1"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Timesheet
                    </Button>
                  )}
                </div>

                {/* Admin Actions Row */}
                {userRole === 'admin' && (
                  <div className="flex justify-center gap-2 pt-1 border-t border-gray-100">
                    {/* Password Reset Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendPasswordReset(user)}
                          disabled={isSendingReset === user.id || !user.email}
                          className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        >
                          {isSendingReset === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <KeyRound className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send password reset email</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {user.is_active ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUserToDeactivate(user)}
                            className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Deactivate user</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivateUser(user)}
                            className="hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Reactivate user</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserToDelete(user)}
                          className="hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete permanently</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Edit User Dialog */}
      <AddEditUserDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUserSaved}
        onDeactivate={async (userId: string, reason: string) => {
          try {
            await deactivateUser(userId, reason);
            toast({
              title: "User deactivated",
              description: `User has been deactivated successfully.`,
            });
            refetch();
          } catch (error) {
            console.error("Error deactivating user:", error);
            toast({
              title: "Error deactivating user",
              description: "Failed to deactivate user. Please try again.",
              variant: "destructive",
            });
          }
        }}
        user={editingUser}
        isNewUser={false}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {userToDelete?.full_name || userToDelete?.email}? 
              This action cannot be undone and will remove all associated data. Consider deactivating instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={!!userToDeactivate} onOpenChange={() => {
        setUserToDeactivate(null);
        setDeactivationReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDeactivate?.full_name || userToDeactivate?.email} will be deactivated and won't be able to access the system, 
              but their data will be preserved. You can reactivate them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="deactivation-reason">Reason (optional)</Label>
            <Textarea
              id="deactivation-reason"
              placeholder="Enter reason for deactivation..."
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateUser}
              disabled={isDeactivating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isDeactivating ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default TeamList;