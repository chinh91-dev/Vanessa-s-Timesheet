import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, UserCheck, Clock, Send, KeyRound, UserMinus, UserCheck2, Loader2, ShieldCheck, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchCustomerLoginsByCompany,
  deleteCustomerLogin,
  updateCustomerLogin,
  CustomerLogin,
} from "@/lib/customer-login-service";
import { supabase } from "@/integrations/supabase/client";
import {
  getInvitationsByCompany,
  cancelInvitation,
  createInvitation,
  Invitation,
} from "@/lib/invitation-service";
import { AddEditCustomerLoginDialog } from "@/components/customers/AddEditCustomerLoginDialog";
import { createPortalUserDirect } from "@/lib/customer-portal-admin-service";
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

interface CustomerAccountManagementProps {
  companyId: string;
  companyName: string;
}

const CustomerAccountManagement: React.FC<CustomerAccountManagementProps> = ({
  companyId,
  companyName,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingLogin, setEditingLogin] = useState<CustomerLogin | null>(null);
  const [isSendingReset, setIsSendingReset] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customer logins
  const { data: customerLogins = [], isLoading: loginsLoading } = useQuery({
    queryKey: ["customerLogins", companyId],
    queryFn: () => fetchCustomerLoginsByCompany(companyId),
  });

  // Fetch pending invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["invitations", companyId],
    queryFn: () => getInvitationsByCompany(companyId),
  });

  // Delete customer login mutation
  const deleteLoginMutation = useMutation({
    mutationFn: deleteCustomerLogin,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer account deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["customerLogins", companyId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["invitations", companyId] });
      setShowDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["invitations", companyId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return updateCustomerLogin({ id, role });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Role updated to ${data.role}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["customerLogins", companyId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return updateCustomerLogin({ id, is_active });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Account ${data.is_active ? 'activated' : 'deactivated'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["customerLogins", companyId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (login: CustomerLogin) => {
    setEditingLogin(login);
    setShowDialog(true);
  };

  const handleDelete = (loginId: string) => {
    deleteLoginMutation.mutate(loginId);
  };

  const handleCancelInvitation = (invitationId: string) => {
    cancelInvitationMutation.mutate(invitationId);
  };

  const handleSendPasswordReset = async (login: CustomerLogin) => {
    if (!login.email) return;
    
    setIsSendingReset(login.id);
    try {
      const redirectUrl = `${window.location.origin}/customer-portal/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(login.email, {
        redirectTo: redirectUrl,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: `A reset link has been sent to ${login.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending reset email",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(null);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingLogin(null);
    queryClient.invalidateQueries({ queryKey: ["customerLogins", companyId] });
    queryClient.invalidateQueries({ queryKey: ["invitations", companyId] });
  };

  const handleInvitationSubmit = async (data: any) => {
    await createInvitationMutation.reset();
    try {
      // Use direct portal user creation with provided password
      // Role is automatically set to 'customer' by the edge function
      const resp = await createPortalUserDirect({
        email: data.email,
        full_name: data.full_name,
        company_id: companyId,
        password: data.password,
      });
      const isExisting = !!resp?.existing_user;
      toast({
        title: 'Success',
        description: isExisting ? 'Existing user linked and invited.' : 'User created and invited via email.'
      });
      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["customerLogins", companyId] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' });
    }
  };

  if (loginsLoading || invitationsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Accounts - {companyName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const hasAccounts = customerLogins.length > 0 || invitations.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>User Accounts - {companyName}</CardTitle>
        <Button
          onClick={() => setShowDialog(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </CardHeader>
      <CardContent>
        {!hasAccounts ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No user accounts found for this company.
            </p>
            <Button
              onClick={() => setShowDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send First Invitation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Accounts */}
            {customerLogins.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Active Accounts ({customerLogins.length})
                </h4>
                <div className="space-y-3">
                  {customerLogins.map((login) => (
                    <div
                      key={login.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{login.full_name}</span>
                          <Badge
                            variant={login.is_active ? "default" : "secondary"}
                          >
                            {login.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {login.role === "admin" ? (
                            <Badge className="bg-purple-600 text-white gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-600 text-white gap-1">
                              <User className="h-3 w-3" />
                              Staff
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {login.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Reset Password Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendPasswordReset(login)}
                          disabled={isSendingReset === login.id}
                          title="Send password reset email"
                        >
                          {isSendingReset === login.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <KeyRound className="h-4 w-4" />
                          )}
                        </Button>
                        
                        {/* Deactivate/Reactivate Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={toggleActiveMutation.isPending}
                              title={login.is_active ? "Deactivate account" : "Reactivate account"}
                            >
                              {login.is_active ? (
                                <UserMinus className="h-4 w-4" />
                              ) : (
                                <UserCheck2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {login.is_active ? "Deactivate Account" : "Reactivate Account"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {login.is_active 
                                  ? "This will prevent the user from logging in. They can be reactivated later."
                                  : "This will allow the user to log in again."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => toggleActiveMutation.mutate({ 
                                  id: login.id, 
                                  is_active: !login.is_active 
                                })}
                              >
                                {login.is_active ? "Deactivate" : "Reactivate"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Role Selector */}
                        <Select
                          value={login.role || "user"}
                          onValueChange={(role) =>
                            changeRoleMutation.mutate({ id: login.id, role })
                          }
                          disabled={changeRoleMutation.isPending}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Edit Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(login)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {/* Delete Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this user account?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(login.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invitations ({invitations.length})
                </h4>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {invitation.full_name}
                          </span>
                          <Badge variant="secondary">Pending</Badge>
                          {invitation.role === "admin" ? (
                            <Badge className="bg-purple-600 text-white gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-600 text-white gap-1">
                              <User className="h-3 w-3" />
                              Staff
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invitation.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this invitation?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelInvitation(invitation.id)}
                              >
                                Cancel Invitation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AddEditCustomerLoginDialog
          open={showDialog}
          onClose={closeDialog}
          customerLogin={editingLogin}
          companyId={companyId}
          onSubmit={editingLogin ? undefined : handleInvitationSubmit}
          isInvitation={!editingLogin}
        />
      </CardContent>
    </Card>
  );
};

export default CustomerAccountManagement;