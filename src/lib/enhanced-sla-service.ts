import { supabase } from "@/integrations/supabase/client";
import type { 
  Incident, 
  IncidentPriority,
  IncidentProject 
} from "@/types/incident-types";

export interface BusinessHours {
  id: string;
  name: string;
  description?: string;
  monday_start?: string;
  monday_end?: string;
  tuesday_start?: string;
  tuesday_end?: string;
  wednesday_start?: string;
  wednesday_end?: string;
  thursday_start?: string;
  thursday_end?: string;
  friday_start?: string;
  friday_end?: string;
  saturday_start?: string;
  saturday_end?: string;
  sunday_start?: string;
  sunday_end?: string;
  timezone: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectSlaOverride {
  id: string;
  incident_project_id: string;
  priority_id: string;
  category_id?: string;
  response_sla_minutes: number;
  resolution_sla_minutes: number;
  escalation_minutes?: number;
  business_hours_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  incident_project_id?: string;
  priority_id?: string;
  category_id?: string;
  trigger_after_minutes: number;
  escalate_to_user_id?: string;
  escalate_to_role?: 'manager' | 'admin' | 'lead';
  escalation_message?: string;
  notify_original_assignee: boolean;
  notify_escalation_target: boolean;
  auto_reassign: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EscalationHistory {
  id: string;
  incident_id: string;
  escalation_rule_id: string;
  triggered_at: string;
  escalated_from?: string;
  escalated_to?: string;
  escalation_reason?: string;
  notification_sent: boolean;
  auto_assigned: boolean;
  created_at: string;
}

export interface SlaNotification {
  id: string;
  incident_id: string;
  notification_type: 'warning' | 'breach' | 'escalation';
  sla_type: 'response' | 'resolution';
  triggered_at: string;
  notification_sent: boolean;
  sent_at?: string;
  recipients?: string[];
  notification_content?: any;
  created_at: string;
}

export interface SlaBreachReport {
  total_incidents: number;
  response_breaches: number;
  resolution_breaches: number;
  average_response_time: number;
  average_resolution_time: number;
  breach_rate: number;
  incidents_by_priority: Record<string, number>;
  incidents_by_project: Record<string, number>;
}

export class EnhancedSlaService {
  // Business Hours Management
  async getBusinessHours(includeInactive = false) {
    const query = supabase
      .from('business_hours')
      .select('*')
      .order('name');
    
    if (!includeInactive) {
      query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as BusinessHours[];
  }

  async createBusinessHours(businessHours: Omit<BusinessHours, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('business_hours')
      .insert(businessHours)
      .select()
      .single();
    
    if (error) throw error;
    return data as BusinessHours;
  }

  async updateBusinessHours(id: string, updates: Partial<BusinessHours>) {
    const { data, error } = await supabase
      .from('business_hours')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as BusinessHours;
  }

  // Project SLA Overrides
  async getProjectSlaOverrides(projectId?: string) {
    const query = supabase
      .from('project_sla_overrides')
      .select(`
        *,
        incident_project:incident_projects(name),
        priority:incident_priorities(name, color),
        category:incident_categories(name),
        business_hours:business_hours(name, timezone)
      `)
      .eq('is_active', true);
    
    if (projectId) {
      query.eq('incident_project_id', projectId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createProjectSlaOverride(override: Omit<ProjectSlaOverride, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('project_sla_overrides')
      .insert(override)
      .select()
      .single();
    
    if (error) throw error;
    return data as ProjectSlaOverride;
  }

  async updateProjectSlaOverride(id: string, updates: Partial<ProjectSlaOverride>) {
    const { data, error } = await supabase
      .from('project_sla_overrides')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as ProjectSlaOverride;
  }

  async deleteProjectSlaOverride(id: string) {
    const { error } = await supabase
      .from('project_sla_overrides')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Escalation Rules - returns raw rules, priorities/categories mapped client-side
  async getEscalationRules(projectId?: string) {
    let rulesQuery = supabase
      .from('escalation_rules')
      .select(`
        *,
        incident_project:incident_projects(name),
        escalate_to_user:profiles!escalation_rules_escalate_to_user_id_fkey(full_name, email)
      `)
      .eq('is_active', true)
      .order('sort_order');
    
    if (projectId) {
      rulesQuery = rulesQuery.eq('incident_project_id', projectId);
    }
    
    const { data, error } = await rulesQuery;
    if (error) throw error;
    
    return data || [];
  }

  async createEscalationRule(rule: Omit<EscalationRule, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('escalation_rules')
      .insert(rule)
      .select()
      .single();
    
    if (error) throw error;
    return data as EscalationRule;
  }

  async updateEscalationRule(id: string, updates: Partial<EscalationRule>) {
    const { data, error } = await supabase
      .from('escalation_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as EscalationRule;
  }

  async deleteEscalationRule(id: string) {
    const { error } = await supabase
      .from('escalation_rules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Escalation History
  async getEscalationHistory(incidentId: string) {
    const { data, error } = await supabase
      .from('escalation_history')
      .select(`
        *,
        escalation_rule:escalation_rules(name),
        escalated_from_user:escalated_from(full_name, email),
        escalated_to_user:escalated_to(full_name, email)
      `)
      .eq('incident_id', incidentId)
      .order('triggered_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // SLA Notifications
  async getSlaNotifications(incidentId?: string) {
    const query = supabase
      .from('sla_notifications')
      .select('*')
      .order('triggered_at', { ascending: false });
    
    if (incidentId) {
      query.eq('incident_id', incidentId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as SlaNotification[];
  }

  async createSlaNotification(notification: Omit<SlaNotification, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('sla_notifications')
      .insert(notification)
      .select()
      .single();
    
    if (error) throw error;
    return data as SlaNotification;
  }

  async markNotificationSent(id: string) {
    const { data, error } = await supabase
      .from('sla_notifications')
      .update({ 
        notification_sent: true, 
        sent_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as SlaNotification;
  }

  // SLA Calculation with Business Hours
  async calculateSlaWithBusinessHours(
    incident: Incident,
    priority: IncidentPriority,
    project?: IncidentProject
  ) {
    // Check for project-specific SLA overrides
    const overrides = await this.getProjectSlaOverrides(incident.incident_project_id);
    const override = overrides.find(o => 
      o.priority_id === incident.priority_id &&
      (!o.category_id || o.category_id === incident.category_id)
    );

    const responseSlaMinutes = override?.response_sla_minutes || priority.response_sla_minutes || 240;
    const resolutionSlaMinutes = override?.resolution_sla_minutes || priority.resolution_sla_minutes || 1440;

    // Calculate time remaining using business hours if configured
    const businessHoursId = override?.business_hours_id;
    
    let responseTimeRemaining = null;
    let resolutionTimeRemaining = null;
    let responseBreached = false;
    let resolutionBreached = false;

    if (incident.created_at) {
      if (businessHoursId) {
        // Use business hours calculation (would need to implement the function)
        responseTimeRemaining = responseSlaMinutes; // Placeholder
        resolutionTimeRemaining = resolutionSlaMinutes; // Placeholder
      } else {
        // Standard 24/7 calculation
        const createdAt = new Date(incident.created_at);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        responseTimeRemaining = responseSlaMinutes - elapsedMinutes;
        resolutionTimeRemaining = resolutionSlaMinutes - elapsedMinutes;
      }

      responseBreached = responseTimeRemaining <= 0 && !incident.first_response_at;
      resolutionBreached = resolutionTimeRemaining <= 0 && incident.status !== 'Resolved' && incident.status !== 'Closed';
    }

    return {
      response_sla_minutes: responseSlaMinutes,
      resolution_sla_minutes: resolutionSlaMinutes,
      response_time_remaining: Math.max(0, responseTimeRemaining || 0),
      resolution_time_remaining: Math.max(0, resolutionTimeRemaining || 0),
      response_sla_breached: responseBreached,
      resolution_sla_breached: resolutionBreached,
      business_hours_id: businessHoursId
    };
  }

  // SLA Reporting
  async generateSlaBreachReport(
    startDate: string,
    endDate: string,
    projectId?: string
  ): Promise<SlaBreachReport> {
    let query = supabase
      .from('incidents')
      .select(`
        *,
        priority:incident_priorities(name),
        incident_project:incident_projects(name)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (projectId) {
      query = query.eq('incident_project_id', projectId);
    }

    const { data: incidents, error } = await query;
    if (error) throw error;

    const totalIncidents = incidents.length;
    let responseBreaches = 0;
    let resolutionBreaches = 0;
    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    const incidentsByPriority: Record<string, number> = {};
    const incidentsByProject: Record<string, number> = {};

    incidents.forEach(incident => {
      // Calculate SLA metrics for each incident
      const createdAt = new Date(incident.created_at);
      const now = new Date();
      
      // Response time calculation
      if (incident.first_response_at) {
        const responseTime = new Date(incident.first_response_at).getTime() - createdAt.getTime();
        totalResponseTime += responseTime / (1000 * 60); // Convert to minutes
      } else {
        responseBreaches++;
      }

      // Resolution time calculation
      if (incident.resolved_at) {
        const resolutionTime = new Date(incident.resolved_at).getTime() - createdAt.getTime();
        totalResolutionTime += resolutionTime / (1000 * 60); // Convert to minutes
      } else if (incident.status !== 'Resolved' && incident.status !== 'Closed') {
        resolutionBreaches++;
      }

      // Group by priority
      const priorityName = incident.priority?.name || 'Unknown';
      incidentsByPriority[priorityName] = (incidentsByPriority[priorityName] || 0) + 1;

      // Group by project
      const projectName = incident.incident_project?.name || 'Unknown';
      incidentsByProject[projectName] = (incidentsByProject[projectName] || 0) + 1;
    });

    return {
      total_incidents: totalIncidents,
      response_breaches: responseBreaches,
      resolution_breaches: resolutionBreaches,
      average_response_time: totalIncidents > 0 ? totalResponseTime / totalIncidents : 0,
      average_resolution_time: totalIncidents > 0 ? totalResolutionTime / totalIncidents : 0,
      breach_rate: totalIncidents > 0 ? ((responseBreaches + resolutionBreaches) / (totalIncidents * 2)) * 100 : 0,
      incidents_by_priority: incidentsByPriority,
      incidents_by_project: incidentsByProject
    };
  }
}