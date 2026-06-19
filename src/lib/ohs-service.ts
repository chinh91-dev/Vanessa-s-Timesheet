import { supabaseOHS as supabase } from "@/integrations/supabase-ohs/client";
import { escapeHtml } from "@/utils/html-generation.utils";
import { csvRowFromFields } from "@/utils/csv-generation.utils";
import { todayLocalYMD } from "@/lib/date-utils";

export interface HazardReport {
  id: string;
  title: string;
  description: string;
  site_area: string;
  exact_location: string;
  category: string;
  likelihood: string;
  consequence: string;
  initial_risk_rating: number;
  status: string;
  created_at: string;
  updated_at: string;
  employee_reporter_name: string;
  employee_reporter_contact?: string;
  manager_taking_report: string;
  intake_source: string;
  exposure?: string;
  hierarchy_of_control: string;
  control_justification: string;
  residual_likelihood?: string;
  residual_consequence?: string;
  residual_risk_rating?: number;
  action_owner?: string;
  due_date?: string;
  review_date?: string;
  signed_off_at?: string;
  signed_off_by?: string;
  rp_likelihood_factor?: string;
  rp_degree_of_harm?: string;
  rp_knowledge_factor?: string;
  rp_available_methods?: string;
  rp_cost_factor?: string;
  consultation_notes?: string;
}

export interface WorkplaceInspection {
  id: string;
  inspection_date: string;
  site_area: string;
  inspector_id: string;
  overall_status: string;
  notes?: string;
  completed_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InjuryRegister {
  id: string;
  incident_date: string;
  incident_time: string;
  is_am_pm: string;
  location: string;
  injured_person_name: string;
  injured_person_contact?: string;
  injury_description: string;
  body_parts_affected: string;
  injury_severity: string;
  equipment_involved: boolean;
  equipment_details?: string;
  witnesses_present: boolean;
  witness_names?: string;
  witness_contacts?: string;
  immediate_action_taken?: string;
  first_aid_provided: boolean;
  first_aid_provider?: string;
  medical_treatment_required: boolean;
  medical_provider?: string;
  emergency_services_called: boolean;
  entry_maker_name: string;
  entry_maker_position: string;
  entry_maker_date: string;
  entry_maker_signature?: string;
  manager_investigation?: string;
  contributing_factors?: string;
  controls_implemented?: string;
  manager_name?: string;
  manager_date?: string;
  manager_signature?: string;
  employer_confirmation?: string;
  employer_date?: string;
  employer_signature?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionItem {
  id: string;
  item_name: string;
  category: string;
  description?: string;
  is_mandatory: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface InspectionResult {
  id: string;
  inspection_id: string;
  inspection_item_id: string;
  status: string;
  notes?: string;
  photo_urls?: string[];
  hazard_raised: boolean;
  hazard_report_id?: string;
}

export interface HRIncident {
  id: string;
  incident_date: string;
  incident_time?: string;
  location: string;
  report_number?: string;
  nature_workplace_injury: boolean;
  nature_harassment_discrimination: boolean;
  nature_policy_violation: boolean;
  nature_other: boolean;
  nature_other_details?: string;
  description: string;
  individuals_involved: { name: string; contact: string }[];
  immediate_actions?: string;
  follow_up_actions?: string;
  prepared_by: string;
  prepared_by_signature?: string;
  date_reported: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Hazard Report Services
export const fetchHazardReports = async (): Promise<HazardReport[]> => {
  const { data, error } = await supabase
    .from('ohs_hazard_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createHazardReport = async (report: Partial<HazardReport>): Promise<HazardReport> => {
  const { data, error } = await supabase
    .from('ohs_hazard_reports')
    .insert([report])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateHazardReport = async (id: string, updates: Partial<HazardReport>): Promise<HazardReport> => {
  const { data, error } = await supabase
    .from('ohs_hazard_reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteHazardReport = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('ohs_hazard_reports')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Workplace Inspection Services
export const fetchWorkplaceInspections = async (): Promise<WorkplaceInspection[]> => {
  const { data, error } = await supabase
    .from('ohs_workplace_inspections')
    .select(`
      *,
      inspector_name:profiles!inspector_id(full_name)
    `)
    .order('inspection_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createWorkplaceInspection = async (inspection: Partial<WorkplaceInspection>): Promise<WorkplaceInspection> => {
  const { data, error } = await supabase
    .from('ohs_workplace_inspections')
    .insert([inspection])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateWorkplaceInspection = async (id: string, updates: Partial<WorkplaceInspection>): Promise<WorkplaceInspection> => {
  const { data, error } = await supabase
    .from('ohs_workplace_inspections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Injury Register Services
export const fetchInjuryRegisters = async (): Promise<InjuryRegister[]> => {
  const { data, error } = await supabase
    .from('ohs_injury_registers')
    .select('*')
    .order('incident_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createInjuryRegister = async (injury: Partial<InjuryRegister>): Promise<InjuryRegister> => {
  const { data, error } = await supabase
    .from('ohs_injury_registers')
    .insert([injury])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateInjuryRegister = async (id: string, updates: Partial<InjuryRegister>): Promise<InjuryRegister> => {
  const { data, error } = await supabase
    .from('ohs_injury_registers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Inspection Items Services
export const fetchInspectionItems = async (): Promise<InspectionItem[]> => {
  const { data, error } = await supabase
    .from('ohs_inspection_items')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Inspection Results Services
export const fetchInspectionResults = async (inspectionId: string): Promise<InspectionResult[]> => {
  const { data, error } = await supabase
    .from('ohs_inspection_results')
    .select('*')
    .eq('inspection_id', inspectionId);

  if (error) throw error;
  return data || [];
};

export const saveInspectionResults = async (results: Partial<InspectionResult>[]): Promise<InspectionResult[]> => {
  const { data, error } = await supabase
    .from('ohs_inspection_results')
    .upsert(results)
    .select();

  if (error) throw error;
  return data || [];
};

// HR Incident Services
export const fetchHRIncidents = async (): Promise<HRIncident[]> => {
  const { data, error } = await supabase
    .from('ohs_hr_incidents')
    .select('*')
    .order('incident_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createHRIncident = async (incident: Partial<HRIncident>): Promise<HRIncident> => {
  const { data, error } = await supabase
    .from('ohs_hr_incidents')
    .insert([incident])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateHRIncident = async (id: string, updates: Partial<HRIncident>): Promise<HRIncident> => {
  const { data, error } = await supabase
    .from('ohs_hr_incidents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteHRIncident = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('ohs_hr_incidents')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Export Services
export const exportOHSData = async (type: 'hazards' | 'inspections' | 'injuries' | 'hr_incidents', format: 'csv' | 'pdf') => {
  let data: HazardReport[] | WorkplaceInspection[] | InjuryRegister[] | HRIncident[] = [];

  switch (type) {
    case 'hazards':
      data = await fetchHazardReports();
      break;
    case 'inspections':
      data = await fetchWorkplaceInspections();
      break;
    case 'injuries':
      data = await fetchInjuryRegisters();
      break;
    case 'hr_incidents':
      data = await fetchHRIncidents();
      break;
  }

  if (format === 'csv') {
    return exportToCSV(data as unknown as Array<Record<string, unknown>>, type);
  } else {
    return exportToPDF(data as unknown as Array<Record<string, unknown>>, type);
  }
};

const exportToCSV = (data: Array<Record<string, unknown>>, type: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    csvRowFromFields(headers),
    ...data.map(row => csvRowFromFields(headers.map(h => row[h] as string | number | null | undefined)))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ohs-${type}-${todayLocalYMD()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const exportToPDF = (data: Array<Record<string, unknown>>, type: string) => {
  // Basic PDF export - in a real app you'd use a library like jsPDF
  const reportTitle = `OHS ${type.charAt(0).toUpperCase() + type.slice(1)} Report`;
  const htmlContent = `
    <html>
      <head>
        <title>${escapeHtml(reportTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(reportTitle)}</h1>
        <p>Generated on: ${escapeHtml(new Date().toLocaleDateString())}</p>
        <table>
          <thead>
            <tr>
              ${Object.keys(data[0] || {}).map(key => `<th>${escapeHtml(String(key))}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${Object.values(row).map(value => `<td>${escapeHtml(String(value ?? ''))}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
};