import { supabase } from "@/integrations/supabase/client";

export interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvitationInput {
  email: string;
  full_name?: string;
  company_id: string;
  role?: string;
}

// Create invitation
export async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  // Check if email already exists
  const existingLogin = await supabase
    .from('customer_logins')
    .select('id')
    .eq('email', input.email)
    .single();

  if (existingLogin.data) {
    throw new Error('A user with this email already exists.');
  }

  // Check for existing pending invitation
  const existingInvitation = await supabase
    .from('invitations')
    .select('id')
    .eq('email', input.email)
    .eq('company_id', input.company_id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existingInvitation.data) {
    throw new Error('A pending invitation for this email already exists.');
  }

  // Generate token and set expiry (7 days from now)
  const token = await generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      email: input.email,
      full_name: input.full_name,
      company_id: input.company_id,
      role: input.role || 'user',
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }

  // Send invitation email
  try {
    const { error: emailError } = await supabase.functions.invoke('send-invitation-emails', {
      body: { invitationId: data.id }
    });
    
    if (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't throw here - invitation was created successfully
    }
  } catch (emailError) {
    console.error('Failed to send invitation email:', emailError);
    // Don't throw here - invitation was created successfully
  }

  return data;
}

// Get invitation by token
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      customer:customers(name)
    `)
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching invitation:', error);
    throw error;
  }

  return data;
}

// Accept invitation and create account
export async function acceptInvitation(token: string, password: string): Promise<void> {
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    throw new Error('Invalid or expired invitation.');
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/customer-portal`,
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    throw new Error('Failed to create user account: ' + authError.message);
  }

  if (!authData.user) {
    throw new Error('Failed to create user account.');
  }

  try {
    // Create customer login record
    const { error: loginError } = await supabase
      .from('customer_logins')
      .insert({
        company_id: invitation.company_id,
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
        is_active: true,
      });

    if (loginError) {
      console.error('Error creating customer login:', loginError);
      throw new Error('Failed to create customer login: ' + loginError.message);
    }

    // Create customer portal user record
    const { error: portalUserError } = await supabase
      .from('customer_portal_users')
      .insert({
        id: authData.user.id,
        email: invitation.email,
        full_name: invitation.full_name,
        is_active: true,
      });

    if (portalUserError) {
      console.error('Error creating customer portal user:', portalUserError);
      throw new Error('Failed to create portal user: ' + portalUserError.message);
    }

    // Mark invitation as used
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
    }
  } catch (error) {
    // Clean up auth user on error
    if (authData?.user?.id) {
      await supabase.auth.admin.deleteUser(authData.user.id);
    }
    throw error;
  }
}

// Generate secure token
async function generateInvitationToken(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_invitation_token');
  
  if (error) {
    console.error('Error generating token:', error);
    // Fallback to client-side generation
    return crypto.randomUUID().replace(/-/g, '');
  }
  
  return data;
}

// Get pending invitations for a company
export async function getInvitationsByCompany(companyId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('company_id', companyId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    throw error;
  }

  return data || [];
}

// Cancel invitation
export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    console.error('Error canceling invitation:', error);
    throw error;
  }
}