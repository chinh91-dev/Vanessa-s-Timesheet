
export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export const validateProjectRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!row.name?.trim()) {
    errors.push({ row: rowIndex, field: 'name', message: 'Project name is required' });
  }
  
  if (!row.budget_hours?.trim()) {
    errors.push({ row: rowIndex, field: 'budget_hours', message: 'Budget hours is required' });
  } else if (isNaN(Number(row.budget_hours)) || Number(row.budget_hours) <= 0) {
    errors.push({ row: rowIndex, field: 'budget_hours', message: 'Budget hours must be a positive number' });
  }
  
  // Validate is_internal field if provided
  if (row.is_internal?.trim() && !['true', 'false'].includes(row.is_internal.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'is_internal', message: 'is_internal must be "true" or "false"' });
  }
  
  // Validate is_active field if provided
  if (row.is_active?.trim() && !['true', 'false'].includes(row.is_active.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'is_active', message: 'is_active must be "true" or "false"' });
  }
  
  // Check customer_name requirement based on is_internal status
  const isInternal = row.is_internal?.toLowerCase() === 'true';
  if (!isInternal && row.customer_name !== undefined && !row.customer_name?.trim()) {
    // For external projects, warn if customer_name is empty (but don't error as it might be optional)
    console.warn(`Row ${rowIndex}: External project without customer_name`);
  }
  
  if (row.start_date?.trim() && !isValidDate(row.start_date)) {
    errors.push({ row: rowIndex, field: 'start_date', message: 'Start date must be in YYYY-MM-DD format' });
  }
  
  if (row.end_date?.trim() && !isValidDate(row.end_date)) {
    errors.push({ row: rowIndex, field: 'end_date', message: 'End date must be in YYYY-MM-DD format' });
  }
  
  if (row.start_date?.trim() && row.end_date?.trim() && 
      isValidDate(row.start_date) && isValidDate(row.end_date) &&
      new Date(row.start_date) >= new Date(row.end_date)) {
    errors.push({ row: rowIndex, field: 'end_date', message: 'End date must be after start date' });
  }
  
  return errors;
};

export const validateCustomerRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!row.name?.trim()) {
    errors.push({ row: rowIndex, field: 'name', message: 'Customer name is required' });
  }
  
  if (row.email?.trim() && !isValidEmail(row.email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format' });
  }
  
  return errors;
};

export const validateContractRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!row.name?.trim()) {
    errors.push({ row: rowIndex, field: 'name', message: 'Contract name is required' });
  }
  
  if (!row.start_date?.trim()) {
    errors.push({ row: rowIndex, field: 'start_date', message: 'Start date is required' });
  } else if (!isValidDDMMYYYYDate(row.start_date)) {
    errors.push({ row: rowIndex, field: 'start_date', message: 'Start date must be in DD/MM/YYYY format' });
  }
  
  if (!row.end_date?.trim()) {
    errors.push({ row: rowIndex, field: 'end_date', message: 'End date is required' });
  } else if (!isValidDDMMYYYYDate(row.end_date)) {
    errors.push({ row: rowIndex, field: 'end_date', message: 'End date must be in DD/MM/YYYY format' });
  }
  
  if (!row.status?.trim()) {
    errors.push({ row: rowIndex, field: 'status', message: 'Status is required' });
  } else if (!['active', 'expired', 'pending_renewal', 'renewed'].includes(row.status)) {
    errors.push({ row: rowIndex, field: 'status', message: 'Status must be: active, expired, pending_renewal, or renewed' });
  }
  
  // Validate date range if both dates are valid
  if (row.start_date?.trim() && row.end_date?.trim() && 
      isValidDDMMYYYYDate(row.start_date) && isValidDDMMYYYYDate(row.end_date)) {
    const startDate = parseDDMMYYYYDate(row.start_date);
    const endDate = parseDDMMYYYYDate(row.end_date);

    if (startDate && endDate && endDate <= startDate) {
      errors.push({ row: rowIndex, field: 'end_date', message: 'End date must be after start date' });
    }
  }
  
  return errors;
};

export const validateTeamMemberRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!row.email?.trim()) {
    errors.push({ row: rowIndex, field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(row.email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format' });
  }
  
  if (!row.password?.trim()) {
    errors.push({ row: rowIndex, field: 'password', message: 'Password is required' });
  } else if (row.password.length < 6) {
    errors.push({ row: rowIndex, field: 'password', message: 'Password must be at least 6 characters' });
  }
  
  if (row.employment_type?.trim() && !['full-time', 'part-time', 'temporary', 'casual', 'fixed-term'].includes(row.employment_type)) {
    errors.push({ row: rowIndex, field: 'employment_type', message: 'Employment type must be: full-time, part-time, temporary, casual, or fixed-term' });
  }
  
  if (row.role?.trim() && !['admin', 'employee'].includes(row.role)) {
    errors.push({ row: rowIndex, field: 'role', message: 'Role must be: admin or employee' });
  }
  
  return errors;
};

export const validateContactRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!row.company_name?.trim()) {
    errors.push({ row: rowIndex, field: 'company_name', message: 'Company name is required' });
  }
  
  if (row.email?.trim() && !isValidEmail(row.email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format' });
  }
  
  return errors;
};

// Legacy alias for backward compatibility
export const validateLeadRow = validateContactRow;

const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
};

const isValidDDMMYYYYDate = (dateString: string): boolean => {
  if (!dateString || dateString.trim() === '') return false;
  
  const trimmedDate = dateString.trim();
  
  // Check if it's already in ISO format (YYYY-MM-DD) - also accept this
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    const date = new Date(trimmedDate);
    return date instanceof Date && !isNaN(date.getTime()) && trimmedDate === date.toISOString().split('T')[0];
  }
  
  // Parse DD/MM/YYYY format
  const ddmmyyyyMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!ddmmyyyyMatch) return false;
  
  const [, day, month, year] = ddmmyyyyMatch;
  
  // Validate the date
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return date.getFullYear() === parseInt(year, 10) && 
         date.getMonth() === parseInt(month, 10) - 1 && 
         date.getDate() === parseInt(day, 10);
};

const parseDDMMYYYYDate = (dateString: string): Date | null => {
  const trimmedDate = dateString.trim();

  // If it's already in ISO format, parse directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return new Date(trimmedDate);
  }

  // Parse DD/MM/YYYY format
  const ddmmyyyyMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }

  // Return null instead of throwing so a single malformed row does not
  // abort the entire CSV import.
  return null;
};

const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};
