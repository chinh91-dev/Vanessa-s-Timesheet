import { supabase } from "@/integrations/supabase/client";

export interface HolidayPermissionAuditData {
  userId: string;
  holidayId: string;
  isAllowed: boolean;
  notes?: string;
  bulkAction?: boolean;
  affectedUsers?: number;
}

export class HolidayAuditService {
  /**
   * Log holiday permission changes for bulk operations
   */
  static async logBulkPermissionChange(
    action: 'granted' | 'revoked',
    holidayId: string,
    userIds: string[],
    notes?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin user display name
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const adminName = adminProfile?.full_name || adminProfile?.email || 'Unknown Admin';

      // Get holiday details
      const { data: holiday } = await supabase
        .from('public_holidays')
        .select('name, date')
        .eq('id', holidayId)
        .single();

      const holidayName = holiday?.name || 'Unknown Holiday';
      const holidayDate = holiday?.date || 'Unknown Date';

      // Get affected user names
      const { data: users } = await supabase
        .from('profiles')
        .select('full_name, email')
        .in('id', userIds);

      const userNames = users?.map(u => u.full_name || u.email).join(', ') || 'Unknown Users';

      const description = `${action === 'granted' ? 'Granted' : 'Revoked'} holiday permission for ${userIds.length} users on ${holidayName} (${holidayDate})`;

      // Insert audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          user_name: adminName,
          action: `holiday_permission_${action}`,
          entity_name: 'Holiday Permission',
          description,
          details: {
            holiday_id: holidayId,
            holiday_name: holidayName,
            holiday_date: holidayDate,
            affected_user_ids: userIds,
            affected_user_names: userNames,
            affected_users_count: userIds.length,
            is_bulk_action: true,
            notes,
            action_type: 'bulk_permission_change'
          }
        });
    } catch (error) {
      console.error('Error logging bulk holiday permission change:', error);
    }
  }

  /**
   * Log custom holiday creation with admin context
   */
  static async logCustomHolidayCreation(
    holidayName: string,
    holidayDate: string,
    state: string,
    affectedUsersCount?: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin user display name
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const adminName = adminProfile?.full_name || adminProfile?.email || 'Unknown Admin';

      const description = `Created custom holiday: ${holidayName} on ${holidayDate} (${state})`;

      // Insert audit log with enhanced context
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          user_name: adminName,
          action: 'custom_holiday_created',
          entity_name: 'Custom Holiday',
          description,
          details: {
            holiday_name: holidayName,
            holiday_date: holidayDate,
            state,
            affected_users_count: affectedUsersCount,
            created_by_admin: adminName,
            action_type: 'holiday_management'
          }
        });
    } catch (error) {
      console.error('Error logging custom holiday creation:', error);
    }
  }

  /**
   * Log leave balance manual adjustments with business context
   */
  static async logBalanceAdjustment(
    targetUserId: string,
    leaveTypeId: string,
    oldBalance: { total: number; used: number; remaining: number },
    newBalance: { total: number; used: number; remaining: number },
    reason: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin user display name
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const adminName = adminProfile?.full_name || adminProfile?.email || 'Unknown Admin';

      // Get target user and leave type details
      const [{ data: targetUser }, { data: leaveType }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', targetUserId)
          .single(),
        supabase
          .from('leave_types')
          .select('name')
          .eq('id', leaveTypeId)
          .single()
      ]);

      const targetUserName = targetUser?.full_name || targetUser?.email || 'Unknown User';
      const leaveTypeName = leaveType?.name || 'Unknown Leave Type';

      const description = `Manually adjusted ${leaveTypeName} balance for ${targetUserName} - Total: ${oldBalance.total} → ${newBalance.total}, Used: ${oldBalance.used} → ${newBalance.used}`;

      // Insert audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          user_name: adminName,
          action: 'leave_balance_updated',
          entity_name: 'Leave Balance',
          description,
          details: {
            target_user_id: targetUserId,
            target_user_name: targetUserName,
            leave_type_id: leaveTypeId,
            leave_type_name: leaveTypeName,
            old_balance: oldBalance,
            new_balance: newBalance,
            adjustment_reason: reason,
            adjusted_by_admin: adminName,
            is_manual_adjustment: true,
            action_type: 'balance_management'
          }
        });
    } catch (error) {
      console.error('Error logging balance adjustment:', error);
    }
  }
}