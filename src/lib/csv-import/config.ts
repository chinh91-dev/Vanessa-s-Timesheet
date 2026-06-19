
import { validateProjectRow, validateCustomerRow, validateContractRow, validateTeamMemberRow, validateContactRow } from "@/lib/csv-validation";

export type EntityType = 'projects' | 'customers' | 'contracts' | 'team-members' | 'contacts';

export const ENTITY_LABELS = {
  projects: 'Projects',
  customers: 'Customers', 
  contracts: 'Contracts',
  'team-members': 'Team Members',
  contacts: 'Contacts'
};

export const REQUIRED_HEADERS = {
  projects: ['name', 'budget_hours'],
  customers: ['name'],
  contracts: ['name', 'start_date', 'end_date', 'status'],
  'team-members': ['full_name', 'email', 'password'],
  contacts: ['company_name']
};

export const VALIDATORS = {
  projects: validateProjectRow,
  customers: validateCustomerRow,
  contracts: validateContractRow,
  'team-members': validateTeamMemberRow,
  contacts: validateContactRow
};

export const BATCH_SIZE = 50;

export const csvImportConfig = {
  users: {
    requiredColumns: ['email', 'password'],
    optionalColumns: ['first_name', 'last_name', 'phone_number', 'address', 'city', 'state', 'zip_code', 'country', 'is_active', 'employee_id'],
    columnMappings: {
      'user_email': 'email',
      'user_password': 'password',
      'first_name': 'first_name',
      'last_name': 'last_name',
      'phone_number': 'phone_number',
      'address': 'address',
      'city': 'city',
      'state': 'state',
      'zip_code': 'zip_code',
      'country': 'country',
      'active': 'is_active',
      'employee_id': 'employee_id'
    },
    sampleData: [
      {
        email: 'john.doe@example.com',
        password: 'securepassword123',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '123-456-7890',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip_code: '12345',
        country: 'USA',
        is_active: 'true',
        employee_id: 'EMP001'
      },
      {
        email: 'jane.smith@example.com',
        password: 'securepassword456',
        first_name: 'Jane',
        last_name: 'Smith',
        phone_number: '987-654-3210',
        address: '456 Elm St',
        city: 'Othertown',
        state: 'NY',
        zip_code: '67890',
        country: 'USA',
        is_active: 'false',
        employee_id: 'EMP002'
      }
    ],
    validationRules: {
      email: 'Required. Email address must be provided.',
      password: 'Required. Password must be provided.',
      first_name: 'Optional. First name.',
      last_name: 'Optional. Last name.',
      phone_number: 'Optional. Phone number.',
      address: 'Optional. Address.',
      city: 'Optional. City.',
      state: 'Optional. State.',
      zip_code: 'Optional. Zip code.',
      country: 'Optional. Country.',
      active: 'Optional. Use "true" or "false". Defaults to "true".',
      employee_id: 'Optional. Unique employee identifier.'
    }
  },
  customers: {
    requiredColumns: ['name'],
    optionalColumns: ['phone_number', 'address', 'city', 'state', 'zip_code', 'country', 'is_active'],
    columnMappings: {
      'customer_name': 'name',
      'phone_number': 'phone_number',
      'address': 'address',
      'city': 'city',
      'state': 'state',
      'zip_code': 'zip_code',
      'country': 'country',
      'active': 'is_active'
    },
    sampleData: [
      {
        name: 'John Doe',
        phone_number: '123-456-7890',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip_code: '12345',
        country: 'USA',
        is_active: 'true'
      },
      {
        name: 'Jane Smith',
        phone_number: '987-654-3210',
        address: '456 Elm St',
        city: 'Othertown',
        state: 'NY',
        zip_code: '67890',
        country: 'USA',
        is_active: 'false'
      }
    ],
    validationRules: {
      name: 'Required. Customer name must be provided.',
      phone_number: 'Optional. Phone number.',
      address: 'Optional. Address.',
      city: 'Optional. City.',
      state: 'Optional. State.',
      zip_code: 'Optional. Zip code.',
      country: 'Optional. Country.',
      active: 'Optional. Use "true" or "false". Defaults to "true".'
    }
  },
  projects: {
    requiredColumns: ['name', 'budget_hours'],
    optionalColumns: ['description', 'customer_name', 'is_internal', 'is_active'],
    columnMappings: {
      'project_name': 'name',
      'project_description': 'description',
      'budget': 'budget_hours',
      'customer': 'customer_name',
      'internal': 'is_internal',
      'active': 'is_active'
    },
    sampleData: [
      {
        name: 'Website Development Project',
        description: 'Client website development and maintenance',
        budget_hours: '120',
        customer_name: 'Acme Corp',
        is_internal: 'false',
        is_active: 'true'
      },
      {
        name: 'Internal Tool Development',
        description: 'Developing internal productivity tools',
        budget_hours: '200',
        customer_name: '',
        is_internal: 'true',
        is_active: 'true'
      }
    ],
    validationRules: {
      name: 'Required. Project name must be provided.',
      budget_hours: 'Required. Budget hours must be provided as a positive number.',
      customer_name: 'Optional. Customer name for client projects. Leave empty for internal projects.',
      is_internal: 'Optional. Use "true" for internal projects, "false" for client projects. Defaults to "false".',
      is_active: 'Optional. Use "true" or "false". Defaults to "true".',
      description: 'Optional. Brief description of the project.'
    }
  },
  contracts: {
    requiredColumns: ['name', 'start_date', 'end_date'],
    optionalColumns: ['description', 'status', 'is_active'],
    columnMappings: {
      'contract_name': 'name',
      'contract_description': 'description',
      'start': 'start_date',
      'end': 'end_date',
      'begin_date': 'start_date',
      'finish_date': 'end_date',
      'active': 'is_active',
      'state': 'status'
    },
    sampleData: [
      {
        name: 'Website Maintenance Contract',
        description: 'Monthly website maintenance and updates',
        start_date: '01/01/2024',
        end_date: '31/12/2024',
        status: 'active',
        is_active: 'true'
      },
      {
        name: 'IT Support Contract',
        description: 'Technical support services',
        start_date: '15/03/2024',
        end_date: '14/03/2025',
        status: 'active',
        is_active: 'true'
      }
    ],
    validationRules: {
      name: 'Required. Contract name must be provided.',
      start_date: 'Required. Use DD/MM/YYYY format (e.g., 01/01/2024).',
      end_date: 'Required. Use DD/MM/YYYY format (e.g., 31/12/2024). Must be after start date.',
      status: 'Optional. Valid values: active, expired, pending_renewal, renewed. Defaults to "active".',
      is_active: 'Optional. Use "true" or "false". Defaults to "true".',
      description: 'Optional. Brief description of the contract.'
    }
  }
};
