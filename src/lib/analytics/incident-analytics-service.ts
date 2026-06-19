import { supabase } from "@/integrations/supabase/client";
import { todayLocalYMD } from "@/lib/date-utils";

export interface IncidentAnalytics {
  id: string;
  date: string;
  incident_project_id?: string;
  priority_id?: string;
  category_id?: string;
  total_incidents: number;
  resolved_incidents: number;
  avg_resolution_time_minutes?: number;
  avg_response_time_minutes?: number;
  sla_breaches: number;
  escalations: number;
}

export interface IncidentTrend {
  date: string;
  new_incidents: number;
  resolved_incidents: number;
  avg_resolution_time: number;
  sla_breaches: number;
  trend_direction: string;
}

export interface IncidentPattern {
  id: string;
  pattern_type: string;
  pattern_name: string;
  description?: string;
  confidence_score: number;
  pattern_data: any;
  detected_at: string;
  is_active: boolean;
}

export interface IncidentPrediction {
  id: string;
  prediction_type: string;
  target_date: string;
  incident_project_id?: string;
  predicted_value: number;
  confidence_level: number;
  model_version?: string;
  actual_value?: number;
  prediction_accuracy?: number;
}

export interface PerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  entity_id?: string;
  entity_type: string;
  period_start: string;
  period_end: string;
  metric_value: number;
  benchmark_value?: number;
  percentile_rank?: number;
  metadata: any;
}

export interface AIClassificationResult {
  suggested_category_id?: string;
  suggested_priority_id?: string;
  confidence_score: number;
  matching_keywords: string[];
}

export class IncidentAnalyticsService {
  // Analytics Data
  static async getAnalytics(
    startDate?: string,
    endDate?: string,
    projectId?: string
  ): Promise<IncidentAnalytics[]> {
    let query = supabase
      .from('incident_analytics')
      .select('*')
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (projectId) {
      query = query.eq('incident_project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Trend Analysis
  static async getIncidentTrends(
    startDate?: string,
    endDate?: string,
    projectId?: string
  ): Promise<IncidentTrend[]> {
    // Try DB function first
    const { data, error } = await supabase.rpc('calculate_incident_trends', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_project_id: projectId
    });

    if (!error) return data || [];

    // Fallback: build trends from raw incidents table
    console.warn('[Analytics] calculate_incident_trends not available, using fallback');
    let query = supabase
      .from('incidents')
      .select('id, created_at, resolved_at, resolution_time_minutes, status')
      .order('created_at', { ascending: true });

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');
    if (projectId) query = query.eq('incident_project_id', projectId);

    const { data: incidents, error: incError } = await query;
    if (incError || !incidents) return [];

    // Group by date
    const byDate: Record<string, { new: number; resolved: number; resolutionTimes: number[] }> = {};
    incidents.forEach((inc: any) => {
      const date = inc.created_at.split('T')[0];
      if (!byDate[date]) byDate[date] = { new: 0, resolved: 0, resolutionTimes: [] };
      byDate[date].new += 1;
      if (inc.resolved_at) {
        byDate[date].resolved += 1;
        if (inc.resolution_time_minutes) byDate[date].resolutionTimes.push(inc.resolution_time_minutes);
      }
    });

    return Object.entries(byDate).map(([date, d]) => ({
      date,
      new_incidents: d.new,
      resolved_incidents: d.resolved,
      avg_resolution_time: d.resolutionTimes.length > 0
        ? Math.round(d.resolutionTimes.reduce((a, b) => a + b, 0) / d.resolutionTimes.length)
        : 0,
      sla_breaches: 0,
      trend_direction: 'stable',
    }));
  }

  // Pattern Detection
  static async getPatterns(): Promise<IncidentPattern[]> {
    const { data, error } = await supabase
      .from('incident_patterns')
      .select('*')
      .eq('is_active', true)
      .order('confidence_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createPattern(pattern: Omit<IncidentPattern, 'id' | 'detected_at'>): Promise<IncidentPattern> {
    const { data, error } = await supabase
      .from('incident_patterns')
      .insert(pattern)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Predictions
  static async getPredictions(
    predictionType?: string,
    projectId?: string
  ): Promise<IncidentPrediction[]> {
    let query = supabase
      .from('incident_predictions')
      .select('*')
      .order('target_date', { ascending: true });

    if (predictionType) {
      query = query.eq('prediction_type', predictionType);
    }
    if (projectId) {
      query = query.eq('incident_project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createPrediction(prediction: Omit<IncidentPrediction, 'id'>): Promise<IncidentPrediction> {
    const { data, error } = await supabase
      .from('incident_predictions')
      .insert(prediction)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Performance Metrics — compute from raw incident data since performance_metrics
  // table may not yet be populated
  static async getPerformanceMetrics(
    metricType?: string,
    entityType?: string,
    entityId?: string
  ): Promise<PerformanceMetric[]> {
    // Derive live performance metrics from the incidents table
    const endDate = todayLocalYMD();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('id, status, response_time_minutes, resolution_time_minutes, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    if (error || !incidents || incidents.length === 0) return [];

    const resolved = incidents.filter((i: any) => ['Resolved', 'Closed'].includes(i.status));
    const withResponse = incidents.filter((i: any) => i.response_time_minutes != null);
    const withResolution = resolved.filter((i: any) => i.resolution_time_minutes != null);

    const avgResponse = withResponse.length > 0
      ? Math.round(withResponse.reduce((s: number, i: any) => s + i.response_time_minutes, 0) / withResponse.length)
      : 0;
    const avgResolution = withResolution.length > 0
      ? Math.round(withResolution.reduce((s: number, i: any) => s + i.resolution_time_minutes, 0) / withResolution.length)
      : 0;
    const resolutionRate = incidents.length > 0
      ? Math.round((resolved.length / incidents.length) * 100)
      : 0;

    const now = new Date().toISOString();
    return [
      {
        id: 'avg-response',
        metric_type: 'response_time',
        metric_name: 'Average Response Time (minutes)',
        entity_type: 'global',
        period_start: startDate,
        period_end: endDate,
        metric_value: avgResponse,
        metadata: {},
      },
      {
        id: 'avg-resolution',
        metric_type: 'resolution_time',
        metric_name: 'Average Resolution Time (minutes)',
        entity_type: 'global',
        period_start: startDate,
        period_end: endDate,
        metric_value: avgResolution,
        metadata: {},
      },
      {
        id: 'resolution-rate',
        metric_type: 'resolution_rate',
        metric_name: 'Resolution Rate (%)',
        entity_type: 'global',
        period_start: startDate,
        period_end: endDate,
        metric_value: resolutionRate,
        metadata: {},
      },
    ] as PerformanceMetric[];
  }

  static async createPerformanceMetric(metric: Omit<PerformanceMetric, 'id'>): Promise<PerformanceMetric> {
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert(metric)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // AI Classification — uses keyword matching if the DB RPC is not available
  static async classifyIncident(
    title: string,
    description: string
  ): Promise<AIClassificationResult> {
    const { data, error } = await supabase.rpc('classify_incident_ai', {
      p_title: title,
      p_description: description
    });

    if (!error && data?.[0]) return data[0];

    // Fallback: keyword-based classification from incident_keywords table
    const text = `${title} ${description}`.toLowerCase();
    const { data: keywords } = await supabase
      .from('incident_keywords')
      .select('keyword, category_id, priority_id, weight, confidence_score')
      .eq('is_active', true);

    if (!keywords || keywords.length === 0) {
      return { confidence_score: 0, matching_keywords: [] };
    }

    const matches = keywords.filter((k: any) => text.includes(k.keyword.toLowerCase()));
    if (matches.length === 0) return { confidence_score: 0, matching_keywords: [] };

    // Pick best matching category and priority by weight
    const best = matches.reduce((a: any, b: any) => (a.weight || 1) >= (b.weight || 1) ? a : b);
    const avgConfidence = matches.reduce((s: number, k: any) => s + (k.confidence_score || 0.5), 0) / matches.length;

    return {
      suggested_category_id: best.category_id || undefined,
      suggested_priority_id: best.priority_id || undefined,
      confidence_score: Math.round(avgConfidence * 100) / 100,
      matching_keywords: matches.map((k: any) => k.keyword),
    };
  }

  // Keywords Management
  static async getIncidentKeywords() {
    const { data, error } = await supabase
      .from('incident_keywords')
      .select(`
        *,
        category:incident_categories(name),
        priority:incident_priorities(name)
      `)
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async addKeyword(keyword: {
    keyword: string;
    category_id?: string;
    priority_id?: string;
    weight?: number;
    confidence_score?: number;
  }) {
    const { data, error } = await supabase
      .from('incident_keywords')
      .insert(keyword)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateKeyword(id: string, updates: any) {
    const { data, error } = await supabase
      .from('incident_keywords')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteKeyword(id: string) {
    const { error } = await supabase
      .from('incident_keywords')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Dashboard Summary
  static async getDashboardSummary(projectId?: string) {
    const endDate = todayLocalYMD();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

    // Use allSettled so one failure doesn't break the whole dashboard
    const [analyticsResult, trendsResult, patternsResult, predictionsResult] = await Promise.allSettled([
      this.getAnalytics(startDate, endDate, projectId),
      this.getIncidentTrends(startDate, endDate, projectId),
      this.getPatterns(),
      this.getPredictions(undefined, projectId)
    ]);

    const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : [];
    const trends = trendsResult.status === 'fulfilled' ? trendsResult.value : [];
    const patterns = patternsResult.status === 'fulfilled' ? patternsResult.value : [];
    const predictions = predictionsResult.status === 'fulfilled' ? predictionsResult.value : [];

    // Calculate summary statistics
    const totalIncidents = analytics.reduce((sum, a) => sum + a.total_incidents, 0);
    const totalResolved = analytics.reduce((sum, a) => sum + a.resolved_incidents, 0);
    const totalBreaches = analytics.reduce((sum, a) => sum + a.sla_breaches, 0);
    const avgResolutionTime = analytics
      .filter(a => a.avg_resolution_time_minutes)
      .reduce((sum, a, _, arr) => sum + (a.avg_resolution_time_minutes || 0) / arr.length, 0);

    const resolutionRate = totalIncidents > 0 ? (totalResolved / totalIncidents) * 100 : 0;
    const breachRate = totalIncidents > 0 ? (totalBreaches / totalIncidents) * 100 : 0;

    return {
      summary: {
        totalIncidents,
        totalResolved,
        resolutionRate,
        avgResolutionTime: Math.round(avgResolutionTime),
        breachRate,
        totalBreaches
      },
      analytics,
      trends,
      patterns: patterns.slice(0, 5), // Top 5 patterns
      predictions: predictions.slice(0, 10) // Next 10 predictions
    };
  }
}