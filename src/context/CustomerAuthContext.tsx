import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/auth-cleanup';

interface CustomerUser {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  company_id: string;
  role: string;
  is_active: boolean;
  must_change_password?: boolean;
  customer?: {
    id: string;
    name: string;
    company?: string;
  };
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  loading: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[CUSTOMER AUTH] Initializing auth listener');
    setLoading(true);

    // Listen for auth changes FIRST and keep the callback synchronous
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[CUSTOMER AUTH] Auth event:', event);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Defer Supabase calls to avoid deadlocks in the callback
        setTimeout(async () => {
          try {
            const { data: customerLogin, error } = await supabase
              .from('customer_logins')
              .select(`
                *,
                customer:customers(*)
              `)
              .eq('email', session.user.email)
              .maybeSingle();

            if (error && error.code !== 'PGRST116') {
              console.error('[CUSTOMER AUTH] Error fetching customer user (auth change):', error);
            }

            if (customerLogin) {
              setUser(customerLogin as CustomerUser);
            }
          } catch (err) {
            console.error('[CUSTOMER AUTH] onAuthStateChange fetch error:', err);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else {
        setLoading(false);
      }
    });

    // Then hydrate initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setTimeout(async () => {
            try {
              const { data: customerLogin, error } = await supabase
                .from('customer_logins')
                .select(`
                  *,
                  customer:customers(*)
                `)
                .eq('email', session.user.email)
                .maybeSingle();

              if (error && error.code !== 'PGRST116') {
                console.error('[CUSTOMER AUTH] Error fetching customer user (initial):', error);
              }

              if (customerLogin) {
                setUser(customerLogin as CustomerUser);
              }
            } catch (err) {
              console.error('[CUSTOMER AUTH] Initial session fetch error:', err);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[CUSTOMER AUTH] getSession error:', err);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[CUSTOMER AUTH] Starting sign in process for:', email);
    setLoading(true);
    
    try {
      // Ensure clean state before attempting sign-in
      try {
        cleanupAuthState();
        await supabase.auth.signOut({ scope: 'global' });
      } catch (_) {
        // ignore cleanup errors
      }

      // Step 1: Authenticate with Supabase
      console.log('[CUSTOMER AUTH] Attempting Supabase auth...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[CUSTOMER AUTH] Supabase auth response:', { 
        user: data.user ? 'User found' : 'No user', 
        error: error?.message 
      });

      if (error) {
        console.error('[CUSTOMER AUTH] Supabase auth error:', error);
        setLoading(false);
        throw error;
      }

      // Step 2: Fetch customer login data
      if (data.user) {
        console.log('[CUSTOMER AUTH] Fetching customer login data...');
        const { data: customerLogin, error: fetchError } = await supabase
          .from('customer_logins')
          .select(`
            *,
            customer:customers(*)
          `)
          .eq('email', data.user.email)
          .maybeSingle();

        console.log('[CUSTOMER AUTH] Customer login query result:', { 
          found: !!customerLogin, 
          error: fetchError?.message,
          errorCode: fetchError?.code
        });

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('[CUSTOMER AUTH] Customer lookup error:', fetchError);
          setLoading(false);
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (customerLogin) {
          console.log('[CUSTOMER AUTH] Successfully found customer login, setting user state');
          setUser(customerLogin as CustomerUser);
          setLoading(false);
          return { error: null };
        } else {
          console.warn('[CUSTOMER AUTH] No customer login found for:', email);
          setLoading(false);
          throw new Error('Customer portal account not found. Please contact your administrator.');
        }
      } else {
        console.error('[CUSTOMER AUTH] No user data returned from Supabase auth');
        setLoading(false);
        throw new Error('Authentication failed - no user data');
      }
    } catch (error) {
      console.error('[CUSTOMER AUTH] Sign in failed:', error);
      setLoading(false);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (e) {
        // Surface in console — previously swallowed silently, masking
        // server-side session-still-valid scenarios where the user
        // believed they had signed out.
        console.warn('[CUSTOMER AUTH] supabase.auth.signOut failed:', e);
      }
    } finally {
      setUser(null);
      // Force clean reload to avoid limbo state. The redirect proceeds
      // even when the remote sign-out failed; the warning above is the
      // signal that the server session may persist.
      window.location.href = '/customer-portal/auth';
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const mustChangePassword = user?.must_change_password ?? false;

  return (
    <CustomerAuthContext.Provider value={{ user, loading, mustChangePassword, signIn, signOut, changePassword }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
