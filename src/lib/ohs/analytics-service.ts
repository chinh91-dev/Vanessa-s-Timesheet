import { supabaseOHS as supabase } from "@/integrations/supabase-ohs/client";
import { OHSValidationService } from './validation-service';

export interface OHSMetrics {
  hazards: HazardMetrics;
  inspections: InspectionMetrics;
  injuries: InjuryMetrics;
  compliance: ComplianceMetrics;
  trends: TrendMetrics;
}

export interface HazardMetrics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byRiskLevel: Record<string, number>;
  avgResolutionTime: number;
  overdue: number;
  highRisk: number;
}

export interface InspectionMetrics {
  total: number;
  complianceRate: number;
  byStatus: Record<string, number>;
  bySiteArea: Record<string, number>;
  avgItemsPerInspection: number;
  trendsOverTime: Array<{ date: string; compliant: number; nonCompliant: number }>;
}

export interface InjuryMetrics {
  total: number;
  bySeverity: Record<string, number>;
  byLocation: Record<string, number>;
  lostTimeRate: number;
  frequencyRate: number;
  severityRate: number;
  nearMisses: number;
  medicalTreatmentCases: number;
}

export interface ComplianceMetrics {
  overallScore: number;
  hazardCompliance: number;
  inspectionCompliance: number;
  injuryReportingCompliance: number;
  regulatoryCompliance: number;
}

export interface TrendMetrics {
  hazardTrends: Array<{ period: string; count: number; riskLevel: string }>;
  injuryTrends: Array<{ period: string; count: number; severity: string }>;
  inspectionTrends: Array<{ period: string; compliance: number }>;
  kpis: {
    ltifr: number; // Lost Time Injury Frequency Rate
    trifr: number; // Total Recordable Injury Frequency Rate
    hazardClosureRate: number;
    inspectionScore: number;
  };
}

export class OHSAnalyticsService {
  // Get comprehensive OHS dashboard metrics
  static async getDashboardMetrics(dateRange?: { start: string; end: string }): Promise<OHSMetrics> {
    try {
      const [hazards, inspections, injuries] = await Promise.all([
        this.getHazardMetrics(dateRange),
        this.getInspectionMetrics(dateRange),
        this.getInjuryMetrics(dateRange),
      ]);

      const compliance = this.calculateComplianceMetrics(hazards, inspections, injuries);
      const trends = await this.getTrendMetrics(dateRange);

      return {
        hazards,
        inspections,
        injuries,
        compliance,
        trends,
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  // Get hazard-specific metrics
  static async getHazardMetrics(dateRange?: { start: string; end: string }): Promise<HazardMetrics> {
    try {
      let query = supabase.from('ohs_hazard_reports').select('*');
      
      if (dateRange) {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }

      const { data: hazards, error } = await query;
      if (error) throw error;

      const total = hazards?.length || 0;
      const byStatus = this.groupByField(hazards || [], 'status');
      const byCategory = this.groupByField(hazards || [], 'category');
      
      // Calculate risk levels
      const byRiskLevel = (hazards || []).reduce((acc, hazard) => {
        const riskInfo = OHSValidationService.getRiskCategory(hazard.initial_risk_rating);
        acc[riskInfo.category] = (acc[riskInfo.category] || 0) + 1;
        return acc;
      }, {});

      // Calculate average resolution time for closed hazards
      const closedHazards = (hazards || []).filter(h => h.status === 'Closed' && h.signed_off_at);
      const avgResolutionTime = closedHazards.length > 0 
        ? closedHazards.reduce((acc, h) => {
            const created = new Date(h.created_at);
            const closed = new Date(h.signed_off_at);
            return acc + (closed.getTime() - created.getTime());
          }, 0) / closedHazards.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Count overdue hazards
      const now = new Date();
      const overdue = (hazards || []).filter(h => 
        h.due_date && new Date(h.due_date) < now && h.status !== 'Closed'
      ).length;

      // Count high risk hazards
      const highRisk = (hazards || []).filter(h => h.initial_risk_rating >= 15).length;

      return {
        total,
        byStatus,
        byCategory,
        byRiskLevel,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        overdue,
        highRisk,
      };
    } catch (error) {
      console.error('Error getting hazard metrics:', error);
      throw error;
    }
  }

  // Get inspection-specific metrics
  static async getInspectionMetrics(dateRange?: { start: string; end: string }): Promise<InspectionMetrics> {
    try {
      let query = supabase.from('ohs_workplace_inspections').select('*');
      
      if (dateRange) {
        query = query.gte('inspection_date', dateRange.start).lte('inspection_date', dateRange.end);
      }

      const { data: inspections, error } = await query;
      if (error) throw error;

      const total = inspections?.length || 0;
      const byStatus = this.groupByField(inspections || [], 'overall_status');
      const bySiteArea = this.groupByField(inspections || [], 'site_area');

      // Calculate compliance rate
      const compliant = (inspections || []).filter(i => i.overall_status === 'Compliant').length;
      const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

      // Get inspection items for average calculation
      const { data: inspectionResults } = await supabase
        .from('ohs_inspection_results')
        .select('inspection_id')
        .in('inspection_id', (inspections || []).map(i => i.id));

      const avgItemsPerInspection = total > 0 
        ? Math.round(((inspectionResults?.length || 0) / total) * 10) / 10
        : 0;

      // Generate trends over time (monthly)
      const trendsOverTime = this.generateInspectionTrends(inspections || []);

      return {
        total,
        complianceRate,
        byStatus,
        bySiteArea,
        avgItemsPerInspection,
        trendsOverTime,
      };
    } catch (error) {
      console.error('Error getting inspection metrics:', error);
      throw error;
    }
  }

  // Get injury-specific metrics
  static async getInjuryMetrics(dateRange?: { start: string; end: string }): Promise<InjuryMetrics> {
    try {
      let query = supabase.from('ohs_injury_registers').select('*');
      
      if (dateRange) {
        query = query.gte('incident_date', dateRange.start).lte('incident_date', dateRange.end);
      }

      const { data: injuries, error } = await query;
      if (error) throw error;

      const total = injuries?.length || 0;
      const bySeverity = this.groupByField(injuries || [], 'injury_severity');
      const byLocation = this.groupByField(injuries || [], 'location');

      // Calculate safety rates (assuming 100,000 hours worked for calculation)
      const hoursWorked = 100000; // This should come from actual work hour data
      const lostTimeInjuries = (injuries || []).filter(i => 
        ['Lost Time', 'Permanent Disability', 'Fatality'].includes(i.injury_severity)
      ).length;
      
      const lostTimeRate = (lostTimeInjuries / hoursWorked) * 200000; // OSHA formula
      const frequencyRate = (total / hoursWorked) * 200000;
      
      // Severity rate (days lost / hours worked * 200,000)
      const severityRate = 0; // Would need days lost data

      const nearMisses = (injuries || []).filter(i => i.injury_severity === 'First Aid').length;
      const medicalTreatmentCases = (injuries || []).filter(i => 
        i.injury_severity === 'Medical Treatment'
      ).length;

      return {
        total,
        bySeverity,
        byLocation,
        lostTimeRate: Math.round(lostTimeRate * 100) / 100,
        frequencyRate: Math.round(frequencyRate * 100) / 100,
        severityRate,
        nearMisses,
        medicalTreatmentCases,
      };
    } catch (error) {
      console.error('Error getting injury metrics:', error);
      throw error;
    }
  }

  // Calculate compliance metrics
  static calculateComplianceMetrics(
    hazards: HazardMetrics,
    inspections: InspectionMetrics,
    injuries: InjuryMetrics
  ): ComplianceMetrics {
    // Hazard compliance (based on closure rate and overdue items)
    const hazardClosureRate = hazards.total > 0 
      ? ((hazards.byStatus['Closed'] || 0) / hazards.total) * 100
      : 100;
    const hazardOverdueRate = hazards.total > 0 
      ? (hazards.overdue / hazards.total) * 100
      : 0;
    const hazardCompliance = Math.max(0, hazardClosureRate - hazardOverdueRate);

    // Inspection compliance
    const inspectionCompliance = inspections.complianceRate;

    // Injury reporting compliance (assume 100% if all required fields completed)
    const injuryReportingCompliance = 95; // Placeholder - would calculate based on completeness

    // Regulatory compliance (combination of factors)
    const regulatoryCompliance = Math.round(
      (hazardCompliance * 0.3 + inspectionCompliance * 0.4 + injuryReportingCompliance * 0.3)
    );

    // Overall score
    const overallScore = Math.round(
      (hazardCompliance * 0.25 + inspectionCompliance * 0.25 + 
       injuryReportingCompliance * 0.25 + regulatoryCompliance * 0.25)
    );

    return {
      overallScore,
      hazardCompliance: Math.round(hazardCompliance),
      inspectionCompliance,
      injuryReportingCompliance,
      regulatoryCompliance,
    };
  }

  // Get trend metrics and KPIs
  static async getTrendMetrics(dateRange?: { start: string; end: string }): Promise<TrendMetrics> {
    try {
      // Get historical data for trends
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [hazards, injuries, inspections] = await Promise.all([
        supabase.from('ohs_hazard_reports')
          .select('*')
          .gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('ohs_injury_registers')
          .select('*')
          .gte('incident_date', sixMonthsAgo.toISOString()),
        supabase.from('ohs_workplace_inspections')
          .select('*')
          .gte('inspection_date', sixMonthsAgo.toISOString()),
      ]);

      const hazardTrends = this.generateHazardTrends(hazards.data || []);
      const injuryTrends = this.generateInjuryTrends(injuries.data || []);
      const inspectionTrends = this.generateInspectionComplianceTrends(inspections.data || []);

      // Calculate KPIs
      const kpis = this.calculateKPIs(hazards.data || [], injuries.data || [], inspections.data || []);

      return {
        hazardTrends,
        injuryTrends,
        inspectionTrends,
        kpis,
      };
    } catch (error) {
      console.error('Error getting trend metrics:', error);
      throw error;
    }
  }

  // Helper methods
  private static groupByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private static generateInspectionTrends(inspections: any[]) {
    // Group by month and calculate compliance
    const monthlyData = inspections.reduce((acc, inspection) => {
      const month = new Date(inspection.inspection_date).toLocaleDateString('en-CA').substring(0, 7);
      if (!acc[month]) {
        acc[month] = { compliant: 0, nonCompliant: 0 };
      }
      if (inspection.overall_status === 'Compliant') {
        acc[month].compliant++;
      } else {
        acc[month].nonCompliant++;
      }
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([date, data]: [string, any]) => ({
      date,
      compliant: data.compliant,
      nonCompliant: data.nonCompliant,
    }));
  }

  private static generateHazardTrends(hazards: any[]) {
    const monthlyData = hazards.reduce((acc, hazard) => {
      const month = new Date(hazard.created_at).toLocaleDateString('en-CA').substring(0, 7);
      const riskInfo = OHSValidationService.getRiskCategory(hazard.initial_risk_rating);
      
      if (!acc[month]) acc[month] = {};
      if (!acc[month][riskInfo.category]) acc[month][riskInfo.category] = 0;
      acc[month][riskInfo.category]++;
      
      return acc;
    }, {});

    const result = [];
    for (const [period, risks] of Object.entries(monthlyData)) {
      for (const [riskLevel, count] of Object.entries(risks as Record<string, number>)) {
        result.push({ period, count, riskLevel });
      }
    }
    return result;
  }

  private static generateInjuryTrends(injuries: any[]) {
    const monthlyData = injuries.reduce((acc, injury) => {
      const month = new Date(injury.incident_date).toLocaleDateString('en-CA').substring(0, 7);
      const severity = injury.injury_severity;
      
      if (!acc[month]) acc[month] = {};
      if (!acc[month][severity]) acc[month][severity] = 0;
      acc[month][severity]++;
      
      return acc;
    }, {});

    const result = [];
    for (const [period, severities] of Object.entries(monthlyData)) {
      for (const [severity, count] of Object.entries(severities as Record<string, number>)) {
        result.push({ period, count, severity });
      }
    }
    return result;
  }

  private static generateInspectionComplianceTrends(inspections: any[]) {
    const monthlyData = inspections.reduce((acc, inspection) => {
      const month = new Date(inspection.inspection_date).toLocaleDateString('en-CA').substring(0, 7);
      if (!acc[month]) acc[month] = { total: 0, compliant: 0 };
      acc[month].total++;
      if (inspection.overall_status === 'Compliant') {
        acc[month].compliant++;
      }
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([period, data]: [string, any]) => ({
      period,
      compliance: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0,
    }));
  }

  private static calculateKPIs(hazards: any[], injuries: any[], inspections: any[]) {
    const lostTimeInjuries = injuries.filter(i => 
      ['Lost Time', 'Permanent Disability', 'Fatality'].includes(i.injury_severity)
    ).length;
    
    const totalRecordableInjuries = injuries.filter(i => 
      i.injury_severity !== 'First Aid'
    ).length;

    // Assuming 100,000 hours worked (this should come from actual data)
    const hoursWorked = 100000;
    
    const ltifr = (lostTimeInjuries / hoursWorked) * 200000;
    const trifr = (totalRecordableInjuries / hoursWorked) * 200000;

    const closedHazards = hazards.filter(h => h.status === 'Closed').length;
    const hazardClosureRate = hazards.length > 0 ? (closedHazards / hazards.length) * 100 : 0;

    const compliantInspections = inspections.filter(i => i.overall_status === 'Compliant').length;
    const inspectionScore = inspections.length > 0 ? (compliantInspections / inspections.length) * 100 : 0;

    return {
      ltifr: Math.round(ltifr * 100) / 100,
      trifr: Math.round(trifr * 100) / 100,
      hazardClosureRate: Math.round(hazardClosureRate),
      inspectionScore: Math.round(inspectionScore),
    };
  }
}