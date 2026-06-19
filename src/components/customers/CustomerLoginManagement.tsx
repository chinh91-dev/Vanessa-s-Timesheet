import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, User, Mail, Building } from 'lucide-react';
import { fetchCustomerLoginsByCompany, deleteCustomerLogin } from '@/lib/customer-login-service';
import AddEditCustomerLoginDialog from './AddEditCustomerLoginDialog';
import { CustomerLogin } from '@/lib/customer-login-service';

interface CustomerLoginManagementProps {
  companyId: string;
  companyName: string;
}

const CustomerLoginManagement: React.FC<CustomerLoginManagementProps> = ({ 
  companyId, 
  companyName 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLogin, setEditingLogin] = useState<CustomerLogin | null>(null);
  const queryClient = useQueryClient();

  const { data: customerLogins = [], isLoading, refetch } = useQuery({
    queryKey: ['customer-logins', companyId],
    queryFn: () => fetchCustomerLoginsByCompany(companyId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-logins', companyId] });
      toast({
        title: 'Success',
        description: 'Customer login deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting customer login:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete customer login',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (login: CustomerLogin) => {
    setEditingLogin(login);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (loginId: string) => {
    if (window.confirm('Are you sure you want to delete this customer login?')) {
      deleteMutation.mutate(loginId);
    }
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingLogin(null);
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading customer logins...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {companyName} - User Accounts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage customer portal access for this company
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add User Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {customerLogins.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No user accounts found for this company</p>
            <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
              Create First User Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {customerLogins.map((login) => (
              <div
                key={login.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{login.full_name || 'No name'}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {login.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={login.is_active ? 'default' : 'secondary'}>
                    {login.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">{login.role}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(login)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(login.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <AddEditCustomerLoginDialog
        isOpen={isAddDialogOpen}
        onClose={closeDialog}
        companyId={companyId}
        existingLogin={editingLogin}
      />
    </Card>
  );
};

export default CustomerLoginManagement;