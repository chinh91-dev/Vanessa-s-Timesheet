
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TeamList from "@/components/team/TeamList";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import AddEditUserDialog from "@/components/team/AddEditUserDialog";
import { createUser } from "@/lib/user-service";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ImportButton from "@/components/common/ImportButton";

const TeamPage = () => {
  const { user, userRole, loading } = useAuth();
  const queryClient = useQueryClient();
  const isAdminRole = userRole === "admin";
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
            <div className="h-10 w-40 bg-muted rounded" />
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  // Return proper UI if user is not admin
  if (!isAdminRole) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">You do not have access to this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddUser = () => {
    console.log("Opening add user dialog");
    setIsAddUserOpen(true);
  };

  const handleCreateUser = (userData: any) => {
    console.log("Creating user:", userData);
    setIsCreatingUser(true);
    
    createUser(userData)
      .then((createdUser) => {
        toast({
          title: "User created",
          description: `New team member ${createdUser.full_name || createdUser.email} has been added successfully`,
        });
        setIsAddUserOpen(false);
        
        // Force refetch users after creating a new user - use multiple strategies for reliability
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.refetchQueries({ queryKey: ["users"] });
        }, 500);
      })
      .catch((error) => {
        toast({
          title: "Error creating user",
          description: error.message || "Failed to create user",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsCreatingUser(false);
      });
  };

  const handleImportComplete = () => {
    // Force refetch users after import
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.refetchQueries({ queryKey: ["users"] });
    }, 500);
  };

  return (
    <div className="container mx-auto px-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-gray-600">Manage and view team members</p>
        </div>
        {isAdminRole && (
          <div className="flex gap-2">
            <ImportButton
              entityType="team-members"
              onImportComplete={handleImportComplete}
              variant="outline"
            />
            
            <Button 
              onClick={handleAddUser}
              size="lg" 
              className="bg-primary hover:bg-primary/90"
              disabled={isCreatingUser}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isCreatingUser ? "Adding..." : "Add Team Member"}
            </Button>
          </div>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader className="bg-muted/50">
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {isAdminRole 
              ? "Manage your team members and their roles" 
              : "View team members"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TeamList />
        </CardContent>
      </Card>

      {isAdminRole && (
        <AddEditUserDialog
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          onSave={handleCreateUser}
          isNewUser={true}
        />
      )}
    </div>
  );
};

export default TeamPage;
