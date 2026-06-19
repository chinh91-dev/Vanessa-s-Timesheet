import { z } from 'zod';

// Validation schemas for OHS entities
export const hazardReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  site_area: z.string().min(1, 'Site area is required'),
  exact_location: z.string().min(1, 'Exact location is required'),
  category: z.enum(['Chemical', 'Physical', 'Biological', 'Ergonomic', 'Psychosocial', 'Environmental']),
  likelihood: z.enum(['Very Unlikely', 'Unlikely', 'Possible', 'Likely', 'Very Likely']),
  consequence: z.enum(['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic']),
  employee_reporter_name: z.string().min(1, 'Reporter name is required'),
  employee_reporter_contact: z.string().optional(),
  manager_taking_report: z.string().uuid('Manager ID must be valid'),
  intake_source: z.string().min(1, 'Intake source is required'),
  exposure: z.string().optional(),
  hierarchy_of_control: z.enum(['Elimination', 'Substitution', 'Engineering', 'Administrative', 'PPE']),
  control_justification: z.string().min(10, 'Control justification must be at least 10 characters'),
  residual_likelihood: z.enum(['Very Unlikely', 'Unlikely', 'Possible', 'Likely', 'Very Likely']).optional(),
  residual_consequence: z.enum(['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic']).optional(),
  action_owner: z.string().uuid('Action owner must be valid').optional(),
  due_date: z.string().optional(),
  review_date: z.string().optional(),
  rp_likelihood_factor: z.string().optional(),
  rp_degree_of_harm: z.string().optional(),
  rp_knowledge_factor: z.string().optional(),
  rp_available_methods: z.string().optional(),
  rp_cost_factor: z.string().optional(),
  consultation_notes: z.string().optional(),
});

export const workplaceInspectionSchema = z.object({
  inspection_date: z.string().min(1, 'Inspection date is required'),
  site_area: z.string().min(1, 'Site area is required'),
  inspector_id: z.string().uuid('Inspector ID must be valid'),
  overall_status: z.enum(['Compliant', 'Non-Compliant', 'Not Applicable', 'Requires Action']),
  notes: z.string().optional(),
});

export const injuryRegisterSchema = z.object({
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_time: z.string().min(1, 'Incident time is required'),
  is_am_pm: z.enum(['AM', 'PM']),
  location: z.string().min(1, 'Location is required'),
  injured_person_name: z.string().min(1, 'Injured person name is required'),
  injured_person_contact: z.string().optional(),
  injury_description: z.string().min(10, 'Injury description must be at least 10 characters'),
  body_parts_affected: z.string().min(1, 'Body parts affected is required'),
  injury_severity: z.enum(['First Aid', 'Medical Treatment', 'Lost Time', 'Permanent Disability', 'Fatality']),
  equipment_involved: z.boolean(),
  equipment_details: z.string().optional(),
  witnesses_present: z.boolean(),
  witness_names: z.string().optional(),
  witness_contacts: z.string().optional(),
  immediate_action_taken: z.string().optional(),
  first_aid_provided: z.boolean(),
  first_aid_provider: z.string().optional(),
  medical_treatment_required: z.boolean(),
  medical_provider: z.string().optional(),
  emergency_services_called: z.boolean(),
  entry_maker_name: z.string().min(1, 'Entry maker name is required'),
  entry_maker_position: z.string().min(1, 'Entry maker position is required'),
  entry_maker_date: z.string().min(1, 'Entry maker date is required'),
  entry_maker_signature: z.string().optional(),
  manager_investigation: z.string().optional(),
  contributing_factors: z.string().optional(),
  controls_implemented: z.string().optional(),
  manager_name: z.string().optional(),
  manager_date: z.string().optional(),
  manager_signature: z.string().optional(),
  employer_confirmation: z.string().optional(),
  employer_date: z.string().optional(),
  employer_signature: z.string().optional(),
  follow_up_required: z.boolean(),
  follow_up_date: z.string().optional(),
  follow_up_notes: z.string().optional(),
  status: z.enum(['Open', 'In Progress', 'Under Review', 'Closed']),
}).refine((data) => {
  // Custom validations
  if (data.equipment_involved && !data.equipment_details?.trim()) {
    return false;
  }
  if (data.witnesses_present && !data.witness_names?.trim()) {
    return false;
  }
  if (data.first_aid_provided && !data.first_aid_provider?.trim()) {
    return false;
  }
  if (data.medical_treatment_required && !data.medical_provider?.trim()) {
    return false;
  }
  if (data.follow_up_required && !data.follow_up_date?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Required fields for selected options are missing",
});

// Business validation rules
export class OHSValidationService {
  // Validate hazard report business rules
  static validateHazardReport(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      hazardReportSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => e.message));
      }
    }

    // Business rule: High risk items must have action owner
    const riskRating = this.calculateRiskRating(data.likelihood, data.consequence);
    if (riskRating >= 15 && !data.action_owner) {
      errors.push('High risk hazards (rating 15+) must have an assigned action owner');
    }

    // Business rule: High risk items must have due date
    if (riskRating >= 15 && !data.due_date) {
      errors.push('High risk hazards (rating 15+) must have a due date for action');
    }

    // Business rule: Due date must be in the future
    if (data.due_date && new Date(data.due_date) <= new Date()) {
      errors.push('Due date must be in the future');
    }

    // Business rule: Review date must be after due date
    if (data.due_date && data.review_date && new Date(data.review_date) <= new Date(data.due_date)) {
      errors.push('Review date must be after the due date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate workplace inspection business rules
  static validateWorkplaceInspection(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      workplaceInspectionSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => e.message));
      }
    }

    // Business rule: Inspection date cannot be in the future
    if (new Date(data.inspection_date) > new Date()) {
      errors.push('Inspection date cannot be in the future');
    }

    // Business rule: Non-compliant inspections must have notes
    if (data.overall_status === 'Non-Compliant' && !data.notes?.trim()) {
      errors.push('Non-compliant inspections must include detailed notes');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate injury register business rules
  static validateInjuryRegister(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      injuryRegisterSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => e.message));
      }
    }

    // Business rule: Incident date cannot be in the future
    if (new Date(data.incident_date) > new Date()) {
      errors.push('Incident date cannot be in the future');
    }

    // Business rule: Serious injuries must have manager investigation
    if (['Lost Time', 'Permanent Disability', 'Fatality'].includes(data.injury_severity) && 
        !data.manager_investigation?.trim()) {
      errors.push('Serious injuries require manager investigation details');
    }

    // Business rule: Medical treatment injuries must have provider details
    if (data.medical_treatment_required && !data.medical_provider?.trim()) {
      errors.push('Medical treatment injuries must specify the medical provider');
    }

    // Business rule: Entry maker date cannot be before incident date
    if (new Date(data.entry_maker_date) < new Date(data.incident_date)) {
      errors.push('Entry maker date cannot be before the incident date');
    }

    // Business rule: Manager date cannot be before entry maker date
    if (data.manager_date && new Date(data.manager_date) < new Date(data.entry_maker_date)) {
      errors.push('Manager date cannot be before the entry maker date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate risk rating using likelihood and consequence
  static calculateRiskRating(likelihood: string, consequence: string): number {
    const likelihoodScores = {
      'Very Unlikely': 1,
      'Unlikely': 2,
      'Possible': 3,
      'Likely': 4,
      'Very Likely': 5
    };

    const consequenceScores = {
      'Insignificant': 1,
      'Minor': 2,
      'Moderate': 3,
      'Major': 4,
      'Catastrophic': 5
    };

    return (likelihoodScores[likelihood as keyof typeof likelihoodScores] || 1) * 
           (consequenceScores[consequence as keyof typeof consequenceScores] || 1);
  }

  // Get risk category based on rating
  static getRiskCategory(rating: number): { category: string; color: string; priority: string } {
    if (rating >= 20) {
      return { category: 'Extreme', color: 'red', priority: 'Immediate Action Required' };
    } else if (rating >= 15) {
      return { category: 'High', color: 'orange', priority: 'Urgent Action Required' };
    } else if (rating >= 10) {
      return { category: 'Medium', color: 'yellow', priority: 'Action Required' };
    } else if (rating >= 5) {
      return { category: 'Low', color: 'blue', priority: 'Monitor' };
    } else {
      return { category: 'Very Low', color: 'green', priority: 'Acceptable' };
    }
  }

  // Validate status transitions
  static isValidStatusTransition(fromStatus: string, toStatus: string, entityType: 'hazard' | 'inspection' | 'injury'): boolean {
    const validTransitions = {
      hazard: {
        'Open': ['In Progress', 'Under Review', 'Closed'],
        'In Progress': ['Under Review', 'Open', 'Closed'],
        'Under Review': ['In Progress', 'Closed'],
        'Closed': ['Open'] // Can reopen if needed
      },
      inspection: {
        'Compliant': ['Non-Compliant', 'Requires Action'],
        'Non-Compliant': ['Compliant', 'Requires Action'],
        'Not Applicable': ['Compliant', 'Non-Compliant', 'Requires Action'],
        'Requires Action': ['Compliant', 'Non-Compliant']
      },
      injury: {
        'Open': ['In Progress', 'Under Review', 'Closed'],
        'In Progress': ['Under Review', 'Open', 'Closed'],
        'Under Review': ['In Progress', 'Closed'],
        'Closed': ['Open'] // Can reopen if needed
      }
    };

    return validTransitions[entityType]?.[fromStatus]?.includes(toStatus) ?? false;
  }

  // Check if user has permission for action
  static hasPermission(userRole: string, action: string, entityType: string): boolean {
    const permissions = {
      admin: ['create', 'read', 'update', 'delete', 'approve', 'export'],
      manager: ['create', 'read', 'update', 'approve', 'export'],
      employee: ['read']
    };

    return permissions[userRole as keyof typeof permissions]?.includes(action) ?? false;
  }
}