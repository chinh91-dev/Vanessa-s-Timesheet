export interface AssetType {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface AssetStatus {
  id: string;
  name: string;
  colour: string;
  is_terminal: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  customer_id?: string;
  is_active: boolean;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  customer?: {
    id: string;
    name: string;
  };
  asset_count?: number;
}

export interface Asset {
  id: string;
  label: string;
  asset_key: string;
  type_id: string;
  status_id: string;
  group_id: string;
  device_user_id?: string;
  location?: string;
  serial_number?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  cost?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  type?: AssetType;
  status?: AssetStatus;
  group?: AssetGroup;
  device_user?: {
    id: string;
    name: string;
    email?: string | null;
  };
  incident_count?: number;
}

export interface AssetAttributeDef {
  id: string;
  type_id: string;
  name: string;
  data_type: 'text' | 'number' | 'date' | 'boolean' | 'url';
  is_required: boolean;
  is_unique: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetAttributeValue {
  id: string;
  asset_id: string;
  attr_def_id: string;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_bool?: boolean;
  value_url?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  definition?: AssetAttributeDef;
}

export interface AssetRelationship {
  id: string;
  src_asset_id: string;
  relation: string;
  dst_asset_id: string;
  created_at: string;
  created_by?: string;

  // Joined data
  destination_asset?: Asset;
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  actor_user_id?: string;
  action: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  created_at: string;

  // Joined data
  actor?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface CreateAssetRequest {
  label: string;
  asset_key?: string; // Auto-generated if not provided
  type_id: string;
  status_id: string;
  group_id: string; // Required after migration
  device_user_id?: string;
  location?: string;
  serial_number?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  cost?: number;
  notes?: string;
  attributes?: Record<string, any>;
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> {
  id: string;
}

export interface AssetFilters {
  search?: string;
  type_ids?: string[];
  status_ids?: string[];
  group_ids?: string[];
  device_user_id?: string;
  location?: string;
  warranty_expiring_days?: number; // 30, 60, 90 days
}

export interface CreateAssetGroupRequest {
  name: string;
  description?: string;
  color?: string;
  customer_id?: string;
  sort_order?: number;
}

export interface UpdateAssetGroupRequest extends Partial<CreateAssetGroupRequest> {
  id: string;
}

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
}

export interface IncidentAssetLink {
  incident_id: string;
  asset_id: string;
  linked_at: string;
  linked_by?: string;
}
