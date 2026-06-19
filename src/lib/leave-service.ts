import { supabase } from "@/integrations/supabase/client";

export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  requires_attachment: boolean;
  default_balance_days: number;
  is_active: boolean;
  max_carry_over_days?: number;
  carry_over_expiry_months?: number;
}

export interface LeaveApplication {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  business_days_count: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submitted_at: string;
  approved_at?: string;
  approved_by?: string;
  manager_comments?: string;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
  user_full_name?: string;
  user_email?: string;
  approved_by_name?: string;
}

export interface LeaveApplicationAttachment {
  id: string;
  application_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  uploaded_at: string;
}

// Leave Types
export const fetchLeaveTypes = async (): Promise<LeaveType[]> => {
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching leave types:', error);
    throw error;
  }

  return data || [];
};

// Leave Applications
export const fetchLeaveApplications = async (userId?: string): Promise<LeaveApplication[]> => {
  let query = supabase
    .from('leave_applications')
    .select(`
      *,
      leave_type:leave_types(*),
      user:profiles!leave_applications_user_id_fkey(full_name, email),
      approved_by_profile:profiles!leave_applications_approved_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching leave applications:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    user_full_name: item.user?.full_name,
    user_email: item.user?.email,
    approved_by_name: item.approved_by_profile?.full_name
  }));
};

export const createLeaveApplication = async (
  application: Pick<LeaveApplication, 'leave_type_id' | 'start_date' | 'end_date' | 'reason'>
): Promise<LeaveApplication> => {
  // Get the current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User must be authenticated to create leave application');
  }

  // Include the user_id in the application data
  const applicationWithUser = {
    ...application,
    user_id: user.id
  };

  const { data, error } = await supabase
    .from('leave_applications')
    .insert(applicationWithUser)
    .select(`
      *,
      leave_type:leave_types(*),
      user:profiles!leave_applications_user_id_fkey(full_name, email)
    `)
    .single();

  if (error) {
    console.error('Error creating leave application:', error);
    throw error;
  }

  return {
    ...data,
    user_full_name: data.user?.full_name,
    user_email: data.user?.email
  };
};

export const updateLeaveApplication = async (
  applicationId: string,
  updates: Partial<Pick<LeaveApplication, 'status' | 'manager_comments' | 'approved_by' | 'approved_at'>>
): Promise<LeaveApplication> => {
  const { data, error } = await supabase
    .from('leave_applications')
    .update(updates)
    .eq('id', applicationId)
    .select(`
      *,
      leave_type:leave_types(*),
      user:profiles!leave_applications_user_id_fkey(full_name, email),
      approved_by_profile:profiles!leave_applications_approved_by_fkey(full_name)
    `)
    .single();

  if (error) {
    console.error('Error updating leave application:', error);
    throw error;
  }

  return {
    ...data,
    user_full_name: data.user?.full_name,
    user_email: data.user?.email,
    approved_by_name: data.approved_by_profile?.full_name
  };
};

export const cancelLeaveApplication = async (applicationId: string): Promise<LeaveApplication> => {
  return updateLeaveApplication(applicationId, { status: 'cancelled' });
};

// Leave Application Attachments
export const uploadLeaveAttachment = async (
  applicationId: string,
  file: File
): Promise<LeaveApplicationAttachment> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${applicationId}/${Date.now()}.${fileExt}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('leave-attachments')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    throw uploadError;
  }

  // Store file path instead of signed URL (signed URLs expire)
  // Create attachment record
  const { data, error } = await supabase
    .from('leave_application_attachments')
    .insert({
      application_id: applicationId,
      file_name: file.name,
      file_url: fileName, // Store the path, not signed URL
      file_type: file.type,
      file_size: file.size
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating attachment record:', error);
    throw error;
  }

  return data;
};

export const fetchLeaveAttachments = async (applicationId: string): Promise<LeaveApplicationAttachment[]> => {
  const { data, error } = await supabase
    .from('leave_application_attachments')
    .select('*')
    .eq('application_id', applicationId)
    .order('uploaded_at');

  if (error) {
    console.error('Error fetching attachments:', error);
    throw error;
  }

  return data || [];
};

// Business days calculation
export const calculateBusinessDays = async (
  startDate: string,
  endDate: string
): Promise<number> => {
  const { data, error } = await supabase.rpc('calculate_business_days', {
    start_date: startDate,
    end_date: endDate
  });

  if (error) {
    console.error('Error calculating business days:', error);
    throw error;
  }

  return data || 0;
};

// Approve/Reject leave applications (admin only)
export const approveLeaveApplication = async (
  applicationId: string,
  managerComments?: string
): Promise<LeaveApplication> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  return updateLeaveApplication(applicationId, {
    status: 'approved',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    manager_comments: managerComments
  });
};

export const rejectLeaveApplication = async (
  applicationId: string,
  managerComments: string
): Promise<LeaveApplication> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  return updateLeaveApplication(applicationId, {
    status: 'rejected',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    manager_comments: managerComments
  });
};

export const deleteLeaveApplication = async (applicationId: string): Promise<void> => {
  const { error } = await supabase
    .from('leave_applications')
    .delete()
    .eq('id', applicationId);

  if (error) {
    console.error('Error deleting leave application:', error);
    throw error;
  }
};