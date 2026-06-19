
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { cleanupAuthState } from "./authUtils";

export const signInOperation = async (email: string, password: string) => {
  try {
    console.log(`Attempting sign in for: ${email}`);
    
    // Clean up any existing auth state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any lingering sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.log("Global signout attempt (ignoring errors):", err);
    }

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    // Check if user is deactivated before allowing login
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_active, full_name")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileData && profileData.is_active === false) {
      console.log(`User ${email} is deactivated, blocking login`);
      
      // Sign out immediately
      await supabase.auth.signOut();
      
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated. Please contact your administrator.",
        variant: "destructive",
      });
      
      throw new Error("Your account has been deactivated. Please contact your administrator.");
    }

    console.log("Sign in successful", {
      userId: data.user?.id,
      userEmail: data.user?.email
    });

    toast({
      title: "Signed in successfully",
      description: "Welcome back!",
    });
  } catch (error: any) {
    throw error;
  }
};

export const signOutOperation = async (userEmail?: string) => {
  try {
    console.log(`Signing out user: ${userEmail}`);
    
    // Clean up auth state
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error("Sign out error:", error);
      }
    } catch (err) {
      console.log("Sign out attempt completed (ignoring errors):", err);
    }

    toast({
      title: "Signed out successfully",
    });
    
    // Force page reload for complete cleanup
    setTimeout(() => {
      window.location.href = '/auth';
    }, 100);
  } catch (error: any) {
    console.error("Sign out error:", error);
    // Force reload even on error
    window.location.href = '/auth';
  }
};

export const changePasswordOperation = async (newPassword: string) => {
  try {
    console.log("Attempting to change password");
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error("Password change error:", error);
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    console.log("Password changed successfully");
    toast({
      title: "Password changed successfully",
      description: "Your password has been updated",
    });
  } catch (error: any) {
    throw error;
  }
};

export const fetchUserRole = async (userId: string) => {
  try {
    console.log(`Fetching role for user: ${userId}`);
    
    // First, try to get the profile data for email, employment_type, must_change_password, and is_active (employee path)
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("email, employment_type, must_change_password, is_active")
      .eq("id", userId)
      .maybeSingle();

    // If no profile found, check if this is a customer user
    if (!profileData) {
      console.log(`No profile found for user ${userId}, checking for customer role`);
      
      const { data: customerRoleData, error: customerRoleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "customer")
        .maybeSingle();

      if (customerRoleData?.role === 'customer') {
        console.log(`User ${userId} identified as customer`);
        return {
          email: null,
          employment_type: null,
          must_change_password: false,
          role: "customer"
        };
      }

      console.error("No profile or customer role found for user:", userId);
      return null;
    }

    // Then, get the user's primary role from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("role", { ascending: true })
      .limit(1);

    if (roleError) {
      console.error("Error fetching user role:", roleError);
      return {
        email: profileData.email,
        employment_type: profileData.employment_type,
        must_change_password: profileData.must_change_password ?? false,
        role: "employee" // Default fallback
      };
    }

    const role = roleData && roleData.length > 0 ? roleData[0].role : "employee";

    console.log(`User role fetched: ${role} for ${profileData.email}, employment: ${profileData.employment_type}, mustChangePassword: ${profileData.must_change_password}, isActive: ${profileData.is_active}`);
    
    return {
      email: profileData.email,
      employment_type: profileData.employment_type,
      must_change_password: profileData.must_change_password ?? false,
      role: role,
      is_active: profileData.is_active ?? true
    };
  } catch (error) {
    console.error("Error in fetchUserRole:", error);
    return null;
  }
};
