import { supabaseOHS as supabase } from "@/integrations/supabase-ohs/client";
import { OHSValidationService } from './validation-service';

export interface WorkflowAction {
  id: string;
  entityType: 'hazard' | 'inspection' | 'injury';
  entityId: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRule {
  trigger: string;
  recipients: string[];
  template: string;
  conditions?: Record<string, any>;
}

export class OHSWorkflowService {
  // Process workflow transitions
  static async processStatusChange(
    entityType: 'hazard' | 'inspection' | 'injury',
    entityId: string,
    newStatus: string,
    notes?: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current entity
      const tableName = this.getTableName(entityType);
      const { data: entity, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', entityId)
        .single();

      if (error || !entity) {
        return { success: false, error: 'Entity not found' };
      }

      // Validate status transition
      if (!OHSValidationService.isValidStatusTransition(entity.status, newStatus, entityType)) {
        return { success: false, error: `Invalid status transition from ${entity.status} to ${newStatus}` };
      }

      // Update entity status
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add workflow-specific fields
      if (newStatus === 'Closed') {
        updateData.signed_off_at = new Date().toISOString();
        updateData.signed_off_by = userId;
      }

      if (entityType === 'inspection' && newStatus === 'Compliant') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', entityId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Log workflow action
      await this.logWorkflowAction({
        entityType,
        entityId,
        action: 'status_change',
        fromStatus: entity.status,
        toStatus: newStatus,
        performedBy: userId || 'system',
        performedAt: new Date().toISOString(),
        notes,
      });

      // Process notifications
      await this.processNotifications(entityType, entityId, newStatus, entity);

      // Handle escalations
      await this.checkEscalations(entityType, entityId, newStatus, entity);

      return { success: true };
    } catch (error) {
      console.error('Error processing status change:', error);
      return { success: false, error: 'Failed to process status change' };
    }
  }

  // Auto-escalation for overdue items
  static async processAutoEscalations(): Promise<void> {
    try {
      const now = new Date();
      
      // Check overdue hazard reports
      const { data: overdueHazards } = await supabase
        .from('ohs_hazard_reports')
        .select('*')
        .in('status', ['Open', 'In Progress'])
        .not('due_date', 'is', null)
        .lt('due_date', now.toISOString());

      for (const hazard of overdueHazards || []) {
        await this.escalateOverdueItem('hazard', hazard);
      }

      // Check overdue inspections (e.g., non-compliant items not addressed)
      const { data: overdueInspections } = await supabase
        .from('ohs_workplace_inspections')
        .select('*')
        .eq('overall_status', 'Non-Compliant')
        .lt('inspection_date', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()); // 7 days old

      for (const inspection of overdueInspections || []) {
        await this.escalateOverdueItem('inspection', inspection);
      }

      // Check overdue injury follow-ups
      const { data: overdueInjuries } = await supabase
        .from('ohs_injury_registers')
        .select('*')
        .eq('follow_up_required', true)
        .not('follow_up_date', 'is', null)
        .lt('follow_up_date', now.toISOString())
        .neq('status', 'Closed');

      for (const injury of overdueInjuries || []) {
        await this.escalateOverdueItem('injury', injury);
      }
    } catch (error) {
      console.error('Error processing auto-escalations:', error);
    }
  }

  // Process periodic reviews
  static async processPeriodicReviews(): Promise<void> {
    try {
      const now = new Date();
      
      // Check items due for review
      const { data: reviewDueHazards } = await supabase
        .from('ohs_hazard_reports')
        .select('*')
        .not('review_date', 'is', null)
        .lte('review_date', now.toISOString())
        .neq('status', 'Closed');

      for (const hazard of reviewDueHazards || []) {
        await this.triggerPeriodicReview('hazard', hazard);
      }
    } catch (error) {
      console.error('Error processing periodic reviews:', error);
    }
  }

  // Generate compliance reports
  static async generateComplianceReport(dateRange: { start: string; end: string }) {
    try {
      const { data: hazards } = await supabase
        .from('ohs_hazard_reports')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      const { data: inspections } = await supabase
        .from('ohs_workplace_inspections')
        .select('*')
        .gte('inspection_date', dateRange.start)
        .lte('inspection_date', dateRange.end);

      const { data: injuries } = await supabase
        .from('ohs_injury_registers')
        .select('*')
        .gte('incident_date', dateRange.start)
        .lte('incident_date', dateRange.end);

      // Calculate compliance metrics
      const metrics = {
        hazards: {
          total: hazards?.length || 0,
          byStatus: this.groupByStatus(hazards || []),
          byRisk: this.groupByRiskLevel(hazards || []),
          overdue: this.countOverdue(hazards || [], 'due_date'),
        },
        inspections: {
          total: inspections?.length || 0,
          byStatus: this.groupByStatus(inspections || [], 'overall_status'),
          complianceRate: this.calculateComplianceRate(inspections || []),
        },
        injuries: {
          total: injuries?.length || 0,
          bySeverity: this.groupBySeverity(injuries || []),
          byStatus: this.groupByStatus(injuries || []),
          lostTime: this.countLostTimeInjuries(injuries || []),
        },
        trends: {
          hazardTrend: this.calculateTrend(hazards || [], 'created_at'),
          injuryTrend: this.calculateTrend(injuries || [], 'incident_date'),
          inspectionTrend: this.calculateTrend(inspections || [], 'inspection_date'),
        }
      };

      return metrics;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  // Private helper methods
  private static getTableName(entityType: 'hazard' | 'inspection' | 'injury'): string {
    const tableMap = {
      hazard: 'ohs_hazard_reports',
      inspection: 'ohs_workplace_inspections',
      injury: 'ohs_injury_registers'
    };
    return tableMap[entityType];
  }

  private static async logWorkflowAction(action: Omit<WorkflowAction, 'id'>): Promise<void> {
    try {
      // Log to audit system
      await supabase.from('audit_logs').insert({
        user_id: action.performedBy,
        action: `ohs_${action.entityType}_${action.action}`,
        entity_name: `OHS ${action.entityType.charAt(0).toUpperCase() + action.entityType.slice(1)}`,
        description: `Status changed from ${action.fromStatus} to ${action.toStatus}`,
        details: {
          entityId: action.entityId,
          fromStatus: action.fromStatus,
          toStatus: action.toStatus,
          notes: action.notes,
          metadata: action.metadata
        }
      });
    } catch (error) {
      console.error('Error logging workflow action:', error);
    }
  }

  private static async processNotifications(
    entityType: string,
    entityId: string,
    newStatus: string,
    entity: any
  ): Promise<void> {
    // Notification logic would go here
    // This would integrate with email/SMS services
    console.log(`Processing notifications for ${entityType} ${entityId} status change to ${newStatus}`);
  }

  private static async checkEscalations(
    entityType: string,
    entityId: string,
    newStatus: string,
    entity: any
  ): Promise<void> {
    // Escalation logic based on risk level, status, and time
    if (entityType === 'hazard' && entity.initial_risk_rating >= 15 && newStatus === 'Open') {
      // High risk hazards should escalate if not addressed within 24 hours
      setTimeout(() => {
        this.escalateHighRiskHazard(entityId);
      }, 24 * 60 * 60 * 1000); // 24 hours
    }
  }

  private static async escalateOverdueItem(entityType: string, item: any): Promise<void> {
    console.log(`Escalating overdue ${entityType}:`, item.id);
    // Send notifications to managers/supervisors
  }

  private static async triggerPeriodicReview(entityType: string, item: any): Promise<void> {
    console.log(`Triggering periodic review for ${entityType}:`, item.id);
    // Create review tasks or notifications
  }

  private static async escalateHighRiskHazard(hazardId: string): Promise<void> {
    console.log(`Escalating high risk hazard:`, hazardId);
    // Send urgent notifications
  }

  private static groupByStatus(items: any[], statusField: string = 'status') {
    return items.reduce((acc, item) => {
      const status = item[statusField];
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  private static groupByRiskLevel(hazards: any[]) {
    return hazards.reduce((acc, hazard) => {
      const rating = hazard.initial_risk_rating;
      const risk = OHSValidationService.getRiskCategory(rating);
      acc[risk.category] = (acc[risk.category] || 0) + 1;
      return acc;
    }, {});
  }

  private static groupBySeverity(injuries: any[]) {
    return injuries.reduce((acc, injury) => {
      const severity = injury.injury_severity;
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
  }

  private static countOverdue(items: any[], dateField: string) {
    const now = new Date();
    return items.filter(item => 
      item[dateField] && new Date(item[dateField]) < now
    ).length;
  }

  private static calculateComplianceRate(inspections: any[]) {
    if (inspections.length === 0) return 0;
    const compliant = inspections.filter(i => i.overall_status === 'Compliant').length;
    return Math.round((compliant / inspections.length) * 100);
  }

  private static countLostTimeInjuries(injuries: any[]) {
    return injuries.filter(i => 
      ['Lost Time', 'Permanent Disability', 'Fatality'].includes(i.injury_severity)
    ).length;
  }

  private static calculateTrend(items: any[], dateField: string) {
    // Simple trend calculation - could be enhanced with more sophisticated analytics
    const sortedItems = items.sort((a, b) => 
      new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime()
    );
    
    if (sortedItems.length < 2) return 'stable';
    
    const firstHalf = sortedItems.slice(0, Math.floor(sortedItems.length / 2));
    const secondHalf = sortedItems.slice(Math.floor(sortedItems.length / 2));
    
    if (secondHalf.length > firstHalf.length) return 'increasing';
    if (secondHalf.length < firstHalf.length) return 'decreasing';
    return 'stable';
  }
}