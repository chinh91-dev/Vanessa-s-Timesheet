import { parse } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { EntityType } from './config';

export const processUsers = (data: any[]): any[] => {
  console.log("Processing users data:", data);

  return data.map((row, index) => {
    try {
      const user = {
        full_name: row.full_name?.toString().trim(),
        email: row.email?.toString().trim(),
        password: row.password?.toString().trim(),
        organization: row.organization?.toString().trim() || '',
        time_zone: row.time_zone?.toString().trim() || 'UTC',
        employee_id: row.employee_id?.toString().trim() || '',
        employee_card_id: row.employee_card_id?.toString().trim() || '',
        role: row.role?.toString().trim() || 'employee',
        employment_type: row.employment_type?.toString().trim() || 'full-time'
      };

      // Validate required fields
      if (!user.full_name) {
        throw new Error('Full name is required');
      }
      if (!user.email) {
        throw new Error('Email is required');
      }
      if (!user.password) {
        throw new Error('Password is required');
      }

      // Validate role
      const validRoles = ['admin', 'employee'];
      if (!validRoles.includes(user.role)) {
        user.role = 'employee'; // Default to employee if invalid
      }

      // Validate employment type
      const validEmploymentTypes = ['full-time', 'part-time', 'temporary', 'casual', 'fixed-term'];
      if (!validEmploymentTypes.includes(user.employment_type)) {
        user.employment_type = 'full-time'; // Default to full-time if invalid
      }

      console.log(`Processed user ${index + 1}:`, user);
      return user;
    } catch (error) {
      console.error(`Error processing user row ${index + 1}:`, error);
      throw new Error(`Row ${index + 1}: ${error.message}`);
    }
  });
};

export const processCustomers = (data: any[]): any[] => {
  console.log("Processing customers data:", data);

  return data.map((row, index) => {
    try {
      const customer = {
        name: row.name?.toString().trim(),
        email: row.email?.toString().trim() || row.contact_email?.toString().trim() || '',
        phone: row.phone?.toString().trim() || row.contact_phone?.toString().trim() || '',
        company: row.company?.toString().trim() || ''
      };

      // Validate required fields
      if (!customer.name) {
        throw new Error('Customer name is required');
      }

      console.log(`Processed customer ${index + 1}:`, customer);
      return customer;
    } catch (error) {
      console.error(`Error processing customer row ${index + 1}:`, error);
      throw new Error(`Row ${index + 1}: ${error.message}`);
    }
  });
};

export const processProjects = (data: any[]): any[] => {
  console.log("Processing projects data:", data);

  return data.map((row, index) => {
    try {
      const project = {
        name: row.name?.toString().trim(),
        description: row.description?.toString().trim() || '',
        budget_hours: parseFloat(row.budget_hours?.toString().trim() || '0'),
        customer_id: row.customer_id?.toString().trim() || null,
        is_internal: row.is_internal !== undefined ? 
          (row.is_internal.toString().toLowerCase() === 'true' || row.is_internal.toString() === '1') : 
          false,
        is_active: row.is_active !== undefined ? 
          (row.is_active.toString().toLowerCase() === 'true' || row.is_active.toString() === '1') : 
          true
      };

      // Validate required fields
      if (!project.name) {
        throw new Error('Project name is required');
      }
      if (!project.budget_hours || project.budget_hours <= 0) {
        throw new Error('Budget hours must be a positive number');
      }

      // For external projects (is_internal=false), customer_id should be provided
      // For internal projects (is_internal=true), customer_id can be null
      if (!project.is_internal && !project.customer_id) {
        console.warn(`Project "${project.name}" is external but has no customer_id - this may cause issues`);
      }

      console.log(`Processed project ${index + 1}:`, project);
      return project;
    } catch (error) {
      console.error(`Error processing project row ${index + 1}:`, error);
      throw new Error(`Row ${index + 1}: ${error.message}`);
    }
  });
};

export const processContracts = (data: any[]): any[] => {
  console.log("Processing contracts data:", data);
  
  return data.map((row, index) => {
    try {
      // Helper function to parse DD/MM/YYYY format
      const parseDate = (dateString: string): string => {
        if (!dateString || dateString.trim() === '') {
          throw new Error('Date is required');
        }
        
        const trimmedDate = dateString.trim();
        
        // Check if it's already in ISO format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
          return trimmedDate;
        }
        
        // Parse DD/MM/YYYY format
        const ddmmyyyyMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyyMatch) {
          const [, day, month, year] = ddmmyyyyMatch;
          const paddedDay = day.padStart(2, '0');
          const paddedMonth = month.padStart(2, '0');
          
          // Validate the date
          const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          if (date.getFullYear() !== parseInt(year, 10) || 
              date.getMonth() !== parseInt(month, 10) - 1 || 
              date.getDate() !== parseInt(day, 10)) {
            throw new Error('Invalid date');
          }
          
          return `${year}-${paddedMonth}-${paddedDay}`;
        }
        
        throw new Error('Date must be in DD/MM/YYYY format');
      };

      const contract = {
        name: row.name?.toString().trim(),
        description: row.description?.toString().trim() || '',
        start_date: parseDate(row.start_date?.toString() || ''),
        end_date: parseDate(row.end_date?.toString() || ''),
        status: (row.status?.toString().trim().toLowerCase() || 'active'),
        is_active: row.is_active !== undefined ? 
          (row.is_active.toString().toLowerCase() === 'true' || row.is_active.toString() === '1') : 
          true
      };

      // Validate required fields
      if (!contract.name) {
        throw new Error('Contract name is required');
      }

      // Validate status
      const validStatuses = ['active', 'expired', 'pending_renewal', 'renewed'];
      if (!validStatuses.includes(contract.status)) {
        contract.status = 'active'; // Default to active if invalid
      }

      // Validate date range
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      console.log(`Processed contract ${index + 1}:`, contract);
      return contract;
      
    } catch (error) {
      console.error(`Error processing contract row ${index + 1}:`, error);
      throw new Error(`Row ${index + 1}: ${error.message}`);
    }
  });
};

// Helper to normalize descriptive header names to simple field names
const normalizeContactFieldName = (fieldName: string): string => {
  const normalized = fieldName.toLowerCase().trim();
  if (normalized.startsWith('source')) return 'source';
  if (normalized.startsWith('status')) return 'status';
  return normalized;
};

export const processContacts = (data: any[]): any[] => {
  console.log("Processing contacts data:", data);

  return data.map((row, index) => {
    try {
      // Normalize row keys to handle descriptive headers
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        normalizedRow[normalizeContactFieldName(key)] = row[key];
      });

      const contact = {
        company_name: normalizedRow.company_name?.toString().trim(),
        contact_name: normalizedRow.contact_name?.toString().trim() || '',
        email: normalizedRow.email?.toString().trim() || null,
        phone: normalizedRow.phone?.toString().trim() || null,
        title: normalizedRow.title?.toString().trim() || null,
        source: normalizedRow.source?.toString().trim() || null,
        status: (normalizedRow.status?.toString().trim().toLowerCase() || 'new'),
        notes: normalizedRow.notes?.toString().trim() || null
      };

      // Validate required fields
      if (!contact.company_name) {
        throw new Error('Company name is required');
      }

      // Validate status - only allow new or working for imports
      const validStatuses = ['new', 'working'];
      if (!validStatuses.includes(contact.status)) {
        contact.status = 'new'; // Default to new if invalid
      }

      console.log(`Processed contact ${index + 1}:`, contact);
      return contact;
    } catch (error) {
      console.error(`Error processing contact row ${index + 1}:`, error);
      throw new Error(`Row ${index + 1}: ${error.message}`);
    }
  });
};

// Legacy alias for backward compatibility
export const processLeads = processContacts;

// Main processRow function that routes to appropriate processor and saves to database
export const processRow = async (
  row: any, 
  entityType: EntityType, 
  existingCustomers: any[] = [],
  rowIndex: number = 0
): Promise<any> => {
  console.log(`Processing ${entityType} row ${rowIndex}:`, row);
  
  try {
    let processedData;
    
    switch (entityType) {
      case 'projects':
        processedData = processProjects([row])[0];
        break;
      case 'customers':
        processedData = processCustomers([row])[0];
        break;
      case 'contracts':
        processedData = processContracts([row])[0];
        break;
      case 'team-members':
        processedData = processUsers([row])[0];
        break;
      case 'contacts':
        processedData = processContacts([row])[0];
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Save the processed data to the database
    let savedData;
    
    switch (entityType) {
      case 'contracts':
        console.log('Saving contract to database:', processedData);
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .insert(processedData)
          .select()
          .single();
        
        if (contractError) {
          console.error('Error saving contract:', contractError);
          throw new Error(`Failed to save contract: ${contractError.message}`);
        }
        
        savedData = contractData;
        console.log('Contract saved successfully:', savedData);
        break;
        
      case 'customers':
        console.log('Saving customer to database:', processedData);
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .insert(processedData)
          .select()
          .single();
        
        if (customerError) {
          console.error('Error saving customer:', customerError);
          throw new Error(`Failed to save customer: ${customerError.message}`);
        }
        
        savedData = customerData;
        console.log('Customer saved successfully:', savedData);
        break;
        
      case 'projects':
        console.log('Saving project to database:', processedData);
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert(processedData)
          .select()
          .single();
        
        if (projectError) {
          console.error('Error saving project:', projectError);
          throw new Error(`Failed to save project: ${projectError.message}`);
        }
        
        savedData = projectData;
        console.log('Project saved successfully:', savedData);
        break;
        
      case 'team-members':
        console.log('Creating team member in Supabase Auth:', processedData);
        
        // For team members, we need to use a different approach since admin API requires service role
        // Let's create the user with signUp instead and handle email confirmation differently
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: processedData.email,
          password: processedData.password,
          options: {
            data: {
              full_name: processedData.full_name,
            },
            emailRedirectTo: undefined // This will prevent email confirmation requirement
          }
        });
        
        if (authError || !authData.user) {
          console.error('Error creating auth user:', authError);
          throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`);
        }
        
        console.log('Auth user created successfully:', authData.user.id);
        
        try {
          // Step 2: Create profile record
          const profileData = {
            id: authData.user.id,
            full_name: processedData.full_name,
            email: processedData.email,
            role: processedData.role,
            organization: processedData.organization,
            time_zone: processedData.time_zone,
            employment_type: processedData.employment_type,
            employee_id: processedData.employee_id,
            employee_card_id: processedData.employee_card_id,
            updated_at: new Date().toISOString(),
          };
          
          console.log('Creating profile record:', profileData);
          
          const { data: profileResult, error: profileError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
            
            // Clean up auth user if profile creation fails
            try {
              await supabase.auth.admin.deleteUser(authData.user.id);
              console.log('Cleaned up auth user after profile creation failure');
            } catch (cleanupError) {
              console.error('Failed to cleanup auth user:', cleanupError);
            }
            
            throw new Error(`Failed to create profile: ${profileError.message}`);
          }
          
          savedData = profileResult;
          console.log('Team member created successfully:', savedData);
          
        } catch (profileCreationError) {
          // If profile creation fails, clean up the auth user
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
            console.log('Cleaned up auth user after error');
          } catch (cleanupError) {
            console.error('Failed to cleanup auth user:', cleanupError);
          }
          throw profileCreationError;
        }
        break;
      
      case 'contacts':
        console.log('Saving contact to database:', processedData);
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .insert(processedData)
          .select()
          .single();
        
        if (contactError) {
          console.error('Error saving contact:', contactError);
          throw new Error(`Failed to save contact: ${contactError.message}`);
        }
        
        savedData = contactData;
        console.log('Contact saved successfully:', savedData);
        break;
        
      default:
        throw new Error(`Unsupported entity type for database save: ${entityType}`);
    }

    console.log(`Successfully processed and saved ${entityType} row ${rowIndex}:`, savedData);
    return savedData;
    
  } catch (error) {
    console.error(`Error processing ${entityType} row ${rowIndex}:`, error);
    throw error;
  }
};
