import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchUserById, User } from "@/lib/user-service";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileForm from "@/components/settings/ProfileForm";
import PasswordChangeForm from "@/components/settings/PasswordChangeForm";
import AppearanceForm from "@/components/settings/AppearanceForm";

const SettingsPage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const userData = await fetchUserById(user.id);
        if (userData) {
          setProfile(userData);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        toast({
          title: "Failed to load profile",
          description: "Could not load user profile information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user?.id]);

  const handleProfileUpdate = (updatedUser: User) => {
    setProfile(updatedUser);
  };
  
  return (
    <div className="container mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <ProfileForm 
              profile={profile} 
              onProfileUpdate={handleProfileUpdate} 
            />
          </TabsContent>
          
          <TabsContent value="security">
            <PasswordChangeForm />
          </TabsContent>
          
          <TabsContent value="appearance">
            <AppearanceForm />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SettingsPage;
