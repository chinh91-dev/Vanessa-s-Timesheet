
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContextType } from "./auth/authTypes";
import { validateSession } from "./auth/authUtils";
import { signInOperation, signOutOperation, changePasswordOperation, fetchUserRole } from "./auth/authOperations";
import { toast } from "@/components/ui/use-toast";

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  employmentType: null,
  mustChangePassword: false,
  signIn: async () => {},
  signOut: async () => {},
  changePassword: async () => {},
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"employee" | "manager" | "admin" | "sale_user" | "sale_manager" | "customer" | null>(null);
  const [employmentType, setEmploymentType] = useState<"full-time" | "part-time" | "temporary" | "casual" | "fixed-term" | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Clear all user-related state
  const clearUserState = () => {
    console.log("Clearing user state");
    setSession(null);
    setUser(null);
    setUserRole(null);
    setEmploymentType(null);
    setMustChangePassword(false);
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log(`Auth state change event: ${event}`, {
          userId: newSession?.user?.id,
          userEmail: newSession?.user?.email,
          hasSession: !!newSession
        });

        if (event === 'SIGNED_OUT' || !newSession) {
          clearUserState();
          setLoading(false);
          return;
        }

        // Handle SIGNED_IN, TOKEN_REFRESHED, and INITIAL_SESSION events
        if (newSession && validateSession(newSession)) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Fetch role for all session events, not just SIGNED_IN
          if (newSession.user) {
            // Use setTimeout to prevent Supabase deadlocks
            setTimeout(async () => {
              if (mounted) {
                await handleUserRoleFetch(newSession.user.id);
                setLoading(false);
              }
            }, 0);
          } else {
            setLoading(false);
          }
        }
      }
    );

    // THEN check for existing session
    const initSession = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      console.log("Initial session check", {
        hasSession: !!existingSession,
        userId: existingSession?.user?.id,
        userEmail: existingSession?.user?.email
      });

      if (existingSession && validateSession(existingSession)) {
        setSession(existingSession);
        setUser(existingSession.user);
        await handleUserRoleFetch(existingSession.user.id);
      } else {
        clearUserState();
      }
      setLoading(false);
    };

    initSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUserRoleFetch = async (userId: string) => {
    const userData = await fetchUserRole(userId);
    if (userData) {
      // Check if user was deactivated while having an active session
      if (userData.is_active === false) {
        console.log("User is deactivated, signing out...");
        
        toast({
          title: "Account Deactivated",
          description: "Your account has been deactivated. Please contact your administrator.",
          variant: "destructive",
        });
        
        await signOutOperation(user?.email);
        return;
      }
      
      setUserRole(userData.role as "employee" | "manager" | "admin" | "sale_user" | "sale_manager" | "customer" || "employee");
      setEmploymentType(userData.employment_type as "full-time" | "part-time" | "temporary" | "casual" | "fixed-term" || "full-time");
      setMustChangePassword(userData.must_change_password ?? false);
      
      // Update user profile with email if missing
      if (!userData.email && user?.email) {
        console.log(`Updating profile email for user: ${userId}`);
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ email: user.email })
          .eq("id", userId);
          
        if (updateError) {
          console.error("Error updating profile email:", updateError);
        }
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInOperation(email, password);
  };

  const signOut = async () => {
    await signOutOperation(user?.email);
  };

  const changePassword = async (newPassword: string) => {
    await changePasswordOperation(newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        employmentType,
        mustChangePassword,
        signIn,
        signOut,
        changePassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
