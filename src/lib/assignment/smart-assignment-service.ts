import { supabase } from "@/integrations/supabase/client";

export interface AssignmentCandidate {
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  score: number;
  workload_score: number;
  skill_score: number;
  availability_score: number;
  current_incidents: number;
  high_priority_incidents: number;
  overdue_incidents: number;
  avg_resolution_hours: number;
  matching_skills: string[];
  is_available: boolean;
}

export interface SmartAssignmentRequest {
  incident_id: string;
  incident_project_id?: string;
  priority_id?: string;
  category_id?: string;
  required_skills?: string[];
  preferred_assignees?: string[];
  excluded_assignees?: string[];
  assignment_strategy?: 'smart' | 'round_robin' | 'workload_balanced' | 'skill_based';
}

export interface SmartAssignmentResult {
  success: boolean;
  assigned_to?: string;
  candidates: AssignmentCandidate[];
  assignment_reason: string;
  error?: string;
}

export class SmartAssignmentService {
  
  /**
   * Main smart assignment method
   */
  static async assignIncident(request: SmartAssignmentRequest): Promise<SmartAssignmentResult> {
    try {
      console.log('🎯 Starting smart assignment for incident:', request.incident_id);
      
      // Get all potential assignees
      const candidates = await this.getAssignmentCandidates(request);
      
      if (candidates.length === 0) {
        return {
          success: false,
          candidates: [],
          assignment_reason: 'No available assignees found',
          error: 'No users available for assignment'
        };
      }

      // Apply assignment strategy
      const selectedCandidate = this.selectBestCandidate(candidates, request.assignment_strategy || 'smart');
      
      if (!selectedCandidate) {
        return {
          success: false,
          candidates,
          assignment_reason: 'No suitable candidate found',
          error: 'Unable to find a suitable assignee'
        };
      }

      // Assign the incident
      const { error: assignError } = await supabase
        .from('incidents')
        .update({ assigned_to: selectedCandidate.user_id })
        .eq('id', request.incident_id);

      if (assignError) {
        throw assignError;
      }

      // Create assignment notification
      await this.createAssignmentNotification({
        incident_id: request.incident_id,
        assigned_to: selectedCandidate.user_id,
        assignment_type: 'initial',
        assignment_reason: `Smart assignment - Score: ${selectedCandidate.score.toFixed(2)}`
      });

      // Update workload metrics
      await this.updateWorkloadMetrics(selectedCandidate.user_id);

      console.log('✅ Successfully assigned incident to:', selectedCandidate.user_name);

      return {
        success: true,
        assigned_to: selectedCandidate.user_id,
        candidates,
        assignment_reason: `Assigned to ${selectedCandidate.user_name} (Score: ${selectedCandidate.score.toFixed(2)})`
      };

    } catch (error) {
      console.error('❌ Smart assignment failed:', error);
      return {
        success: false,
        candidates: [],
        assignment_reason: 'Assignment failed due to error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all potential assignment candidates with scoring
   */
  private static async getAssignmentCandidates(request: SmartAssignmentRequest): Promise<AssignmentCandidate[]> {
    // Get users with their workload metrics and skills
    const [usersResult, rolesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          employment_type
        `)
        .eq('is_active', true),
      supabase
        .from('user_roles')
        .select('user_id, role')
        .neq('role', 'customer')
    ]);

    if (usersResult.error) throw usersResult.error;
    if (rolesResult.error) throw rolesResult.error;

    // Create role lookup map
    const rolesMap = new Map(rolesResult.data?.map(r => [r.user_id, r.role]) || []);
    
    // Filter to only non-customer users
    const nonCustomerUserIds = new Set(rolesResult.data?.map(r => r.user_id) || []);
    const usersData = (usersResult.data || []).filter(u => nonCustomerUserIds.has(u.id));

    const candidates: AssignmentCandidate[] = [];

    // Batch fetch workload metrics + skills for all candidate users in
    // two queries instead of two-per-user. Eliminates the N+1 round-trip
    // that previously made this scale linearly with the user table.
    const eligibleUserIds = (usersData || [])
      .filter((u) => !request.excluded_assignees?.includes(u.id))
      .map((u) => u.id);

    const [workloadBatch, skillsBatch] = eligibleUserIds.length > 0
      ? await Promise.all([
          supabase
            .from('workload_metrics')
            .select('*')
            .in('user_id', eligibleUserIds),
          supabase
            .from('user_skills')
            .select(`
              user_id,
              skill_name,
              proficiency_level,
              skill_categories (name)
            `)
            .in('user_id', eligibleUserIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const workloadByUser = new Map<string, any>();
    (workloadBatch.data || []).forEach((row: any) => workloadByUser.set(row.user_id, row));
    const skillsByUser = new Map<string, any[]>();
    (skillsBatch.data || []).forEach((row: any) => {
      const arr = skillsByUser.get(row.user_id) || [];
      arr.push(row);
      skillsByUser.set(row.user_id, arr);
    });

    for (const user of usersData || []) {
      // Skip excluded users
      if (request.excluded_assignees?.includes(user.id)) {
        continue;
      }

      const workloadData = workloadByUser.get(user.id);
      const skillsData = skillsByUser.get(user.id) || [];

      // Calculate scores
      const workloadScore = this.calculateWorkloadScore(workloadData);
      const skillScore = this.calculateSkillScore(skillsData || [], request.required_skills || []);
      const availabilityScore = workloadData?.is_available ? 1.0 : 0.0;
      
      // Preferred assignee bonus
      const preferredBonus = request.preferred_assignees?.includes(user.id) ? 0.5 : 0.0;
      
      const totalScore = (workloadScore * 0.4) + (skillScore * 0.4) + (availabilityScore * 0.2) + preferredBonus;

        const candidate: AssignmentCandidate = {
          user_id: user.id,
          user_name: user.full_name || user.email || 'Unknown User',
          user_email: user.email || '',
          role: rolesMap.get(user.id) || 'employee',
          score: totalScore,
          workload_score: workloadScore,
          skill_score: skillScore,
        availability_score: availabilityScore,
        current_incidents: workloadData?.current_incident_count || 0,
        high_priority_incidents: workloadData?.high_priority_count || 0,
        overdue_incidents: workloadData?.overdue_count || 0,
        avg_resolution_hours: workloadData?.avg_resolution_hours || 0,
        matching_skills: this.getMatchingSkills(skillsData || [], request.required_skills || []),
        is_available: workloadData?.is_available || true
      };

      candidates.push(candidate);
    }

    // Sort by score (highest first)
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate workload score (higher score = less workload)
   */
  private static calculateWorkloadScore(workload: any): number {
    if (!workload) return 1.0;

    const maxIncidents = 10; // Configurable threshold
    const incidentLoad = Math.min(workload.current_incident_count / maxIncidents, 1.0);
    const priorityLoad = Math.min(workload.high_priority_count / 5, 1.0);
    const overdueLoad = Math.min(workload.overdue_count / 3, 1.0);

    // Invert scores so lower workload = higher score
    const score = 1.0 - ((incidentLoad * 0.5) + (priorityLoad * 0.3) + (overdueLoad * 0.2));
    return Math.max(score, 0.1); // Minimum score of 0.1
  }

  /**
   * Calculate skill matching score
   */
  private static calculateSkillScore(userSkills: any[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 0.5; // Neutral score if no skills required

    let totalScore = 0;
    let matchedSkills = 0;

    for (const requiredSkill of requiredSkills) {
      const matchingSkill = userSkills.find(skill => 
        skill.skill_name.toLowerCase().includes(requiredSkill.toLowerCase()) ||
        skill.skill_categories?.name.toLowerCase().includes(requiredSkill.toLowerCase())
      );

      if (matchingSkill) {
        // Score based on proficiency level (1-5)
        totalScore += matchingSkill.proficiency_level / 5;
        matchedSkills++;
      }
    }

    return matchedSkills > 0 ? totalScore / requiredSkills.length : 0.1;
  }

  /**
   * Get matching skills for display
   */
  private static getMatchingSkills(userSkills: any[], requiredSkills: string[]): string[] {
    const matching: string[] = [];
    
    for (const requiredSkill of requiredSkills) {
      const matchingSkill = userSkills.find(skill => 
        skill.skill_name.toLowerCase().includes(requiredSkill.toLowerCase()) ||
        skill.skill_categories?.name.toLowerCase().includes(requiredSkill.toLowerCase())
      );

      if (matchingSkill) {
        matching.push(matchingSkill.skill_name);
      }
    }

    return matching;
  }

  /**
   * Select the best candidate based on strategy
   */
  private static selectBestCandidate(candidates: AssignmentCandidate[], strategy: string): AssignmentCandidate | null {
    if (candidates.length === 0) return null;

    switch (strategy) {
      case 'round_robin':
        return this.selectRoundRobin(candidates);
      
      case 'workload_balanced':
        return candidates.sort((a, b) => a.current_incidents - b.current_incidents)[0];
      
      case 'skill_based':
        return candidates.sort((a, b) => b.skill_score - a.skill_score)[0];
      
      case 'smart':
      default:
        // Return highest scoring available candidate
        return candidates.find(c => c.is_available) || candidates[0];
    }
  }

  /**
   * Round-robin selection based on last assignment time
   */
  private static selectRoundRobin(candidates: AssignmentCandidate[]): AssignmentCandidate {
    // For now, select the one with the least recent assignment
    // In a full implementation, we'd track last assignment times
    return candidates.sort((a, b) => a.current_incidents - b.current_incidents)[0];
  }

  /**
   * Create assignment notification
   */
  private static async createAssignmentNotification(params: {
    incident_id: string;
    assigned_to: string;
    assignment_type: 'initial' | 'reassignment' | 'escalation';
    assignment_reason: string;
  }) {
    const { error } = await supabase
      .from('assignment_notifications')
      .insert({
        incident_id: params.incident_id,
        assigned_to: params.assigned_to,
        assigned_by: null, // System assignment
        assignment_type: params.assignment_type,
        notification_type: 'in_app',
        notification_content: {
          message: `New incident assigned: ${params.assignment_reason}`,
          incident_id: params.incident_id,
          assignment_reason: params.assignment_reason
        }
      });

    if (error) {
      console.error('Failed to create assignment notification:', error);
    }
  }

  /**
   * Update workload metrics for a user
   */
  private static async updateWorkloadMetrics(userId: string) {
    const { error } = await supabase.rpc('update_workload_metrics', {
      p_user_id: userId
    });

    if (error) {
      console.error('Failed to update workload metrics:', error);
    }
  }

  /**
   * Add incident to assignment queue for processing
   */
  static async queueIncidentForAssignment(request: SmartAssignmentRequest): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('assignment_queues')
        .insert({
          incident_id: request.incident_id,
          required_skills: request.required_skills || [],
          preferred_assignees: request.preferred_assignees || [],
          excluded_assignees: request.excluded_assignees || [],
          assignment_strategy: request.assignment_strategy || 'smart',
          priority_weight: await this.calculatePriorityWeight(request.priority_id)
        });

      return !error;
    } catch (error) {
      console.error('Failed to queue incident for assignment:', error);
      return false;
    }
  }

  /**
   * Calculate priority weight for queue processing
   */
  private static async calculatePriorityWeight(priorityId?: string): Promise<number> {
    if (!priorityId) return 1.0;

    const { data: priority } = await supabase
      .from('incident_priorities')
      .select('name')
      .eq('id', priorityId)
      .single();

    if (!priority) return 1.0;

    switch (priority.name.toLowerCase()) {
      case 'critical': return 4.0;
      case 'high': return 3.0;
      case 'medium': return 2.0;
      case 'low': return 1.0;
      default: return 1.0;
    }
  }
}