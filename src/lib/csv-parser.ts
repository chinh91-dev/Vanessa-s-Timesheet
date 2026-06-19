
export interface ParsedCSVData {
  headers: string[];
  data: Record<string, string>[];
  errors: string[];
}

export const parseCSV = (csvText: string): ParsedCSVData => {
  const lines = csvText.trim().split('\n');
  const errors: string[] = [];
  
  if (lines.length === 0) {
    return { headers: [], data: [], errors: ['CSV file is empty'] };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  if (headers.length === 0) {
    return { headers: [], data: [], errors: ['No headers found in CSV'] };
  }

  // Parse data rows
  const data: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue; // Skip empty lines
    
    const values = parseCSVLine(lines[i]);
    
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
      continue;
    }
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }

  return { headers, data, errors };
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
};

export const generateCSVTemplate = (entityType: 'projects' | 'customers' | 'contracts' | 'team-members' | 'contacts' | 'services'): string => {
  const templates = {
    projects: 'name,description,budget_hours,customer_name,is_internal,is_active\n"Website Development","Client website project",120,"Acme Corp",false,true\n"Internal Tool Development","Internal productivity tools",200,"",true,true',
    customers: 'name,email,phone,company\n"John Doe","john@example.com","+1234567890","Acme Corp"',
    contracts: 'name,description,start_date,end_date,status,customer_name\n"Annual Support","24/7 support service",01/01/2024,31/12/2024,"active","Sample Customer"',
    'team-members': 'full_name,email,password,role,organization,time_zone,employment_type,employee_id,employee_card_id\n"Jane Smith","jane@company.com","TempPass123","employee","Engineering","America/New_York","full-time","EMP001","CARD001"\n"John Doe","john@company.com","TempPass456","admin","Management","America/Los_Angeles","part-time","EMP002","CARD002"\n"Bob Wilson","bob@company.com","TempPass789","employee","Operations","America/Chicago","temporary","EMP003","CARD003"\n"Alice Brown","alice@company.com","TempPass012","employee","Support","America/Denver","casual","EMP004","CARD004"\n"Sarah Connor","sarah@company.com","TempPass345","employee","Engineering","America/New_York","fixed-term","EMP005","CARD005"',
    contacts: 'contact_name,company_name,email,work_phone,mobile_phone,title,source,notes\n"John Smith","Acme Corporation","john@acme.com","02 1234 5678","0412 345 678","CEO","website","Interested in our services"\n"Jane Doe","Tech Solutions","jane@techsolutions.com","","0498 765 432","CTO","referral","Referred by existing customer"',
    services: 'name,sku,category,"billing_types (monthly/one_off/t_and_m - comma separated)",is_active\n"Cloud Support","SVC-001","Infrastructure","monthly,t_and_m",true\n"Setup Fee","SVC-002","Professional Services","one_off",true'
  };
  
  return templates[entityType];
};
