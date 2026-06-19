
export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_name: string;
  description: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AuditFilters {
  startDate: Date;
  endDate: Date;
  userId?: string;
  actionType?: string;
}

export interface ReportGenerationDetails {
  reportType: string;
  filters: {
    startDate: string;
    endDate: string;
    userId?: string | null;
    projectId?: string | null;
    customerId?: string | null;
    contractId?: string | null;
    actionType?: string | null;
    includeProject?: boolean;
    includeContract?: boolean;
  };
  resultCount: number;
}
