import { supabase } from "@/integrations/supabase/client";
import type {
  Asset,
  AssetType,
  AssetStatus,
  AssetAttributeDef,
  AssetAttributeValue,
  AssetHistory,
  AssetRelationship,
  CreateAssetRequest,
  UpdateAssetRequest,
  AssetFilters,
  AssetListResponse
} from "@/types/asset-types";

export class AssetService {
  // Asset Types
  static async getAssetTypes(): Promise<AssetType[]> {
    const { data, error } = await supabase
      .from('asset_types')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Asset Statuses
  static async getAssetStatuses(): Promise<AssetStatus[]> {
    const { data, error } = await supabase
      .from('asset_statuses')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Assets
  static async getAssets(
    filters: AssetFilters = {},
    page = 1,
    limit = 50
  ): Promise<AssetListResponse> {
    let query = supabase
      .from('assets')
      .select(`
        *,
        type:asset_types(*),
        status:asset_statuses(*),
        group:asset_groups!assets_group_id_fkey(*),
        device_user:device_users(*),
        incident_count:incident_assets(count)
      `, { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.or(`label.ilike.%${filters.search}%,asset_key.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
    }

    if (filters.type_ids?.length) {
      query = query.in('type_id', filters.type_ids);
    }

    if (filters.status_ids?.length) {
      query = query.in('status_id', filters.status_ids);
    }

    if (filters.group_ids?.length) {
      query = query.in('group_id', filters.group_ids);
    }

    if (filters.device_user_id) {
      if (filters.device_user_id === 'unassigned') {
        query = query.is('device_user_id', null);
      } else {
        query = query.eq('device_user_id', filters.device_user_id);
      }
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.warranty_expiring_days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.warranty_expiring_days);
      query = query
        .not('warranty_expiry', 'is', null)
        .lte('warranty_expiry', futureDate.toLocaleDateString('en-CA'));
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Sorting
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      assets: (data || []) as unknown as Asset[],
      total: count || 0,
      page,
      limit
    };
  }

  static async getAssetById(id: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        type:asset_types(*),
        status:asset_statuses(*),
        device_user:device_users(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as Asset | null;
  }

  static async createAsset(asset: CreateAssetRequest): Promise<Asset> {
    const { attributes, ...assetData } = asset;

    // Ensure group_id is provided (now required)
    if (!assetData.group_id) {
      throw new Error('Asset group is required');
    }

    // Auto-generate asset key if not provided
    if (!assetData.asset_key) {
      const { data: generatedKey, error: keyError } = await supabase
        .rpc('generate_asset_key', { p_group_id: assetData.group_id });

      if (keyError) throw keyError;
      assetData.asset_key = generatedKey;
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({
        ...assetData,
        asset_key: assetData.asset_key!,
        group_id: assetData.group_id
      })
      .select(`
        *,
        type:asset_types(*),
        status:asset_statuses(*),
        group:asset_groups!assets_group_id_fkey(*),
        device_user:device_users(*)
      `)
      .single();

    if (error) throw error;

    // Handle custom attributes if provided
    if (attributes && Object.keys(attributes).length > 0) {
      await this.updateAssetAttributes(data.id, attributes);
    }

    return data as unknown as Asset;
  }

  static async updateAsset(asset: UpdateAssetRequest): Promise<Asset> {
    const { id, attributes, ...assetData } = asset;

    const { data, error } = await supabase
      .from('assets')
      .update(assetData)
      .eq('id', id)
      .select(`
        *,
        type:asset_types(*),
        status:asset_statuses(*),
        group:asset_groups!assets_group_id_fkey(*),
        device_user:device_users(*)
      `)
      .single();

    if (error) throw error;

    // Handle custom attributes if provided
    if (attributes) {
      await this.updateAssetAttributes(id, attributes);
    }

    return data as unknown as Asset;
  }

  static async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Asset Attributes
  static async getAssetAttributeDefinitions(typeId: string): Promise<AssetAttributeDef[]> {
    const { data, error } = await supabase
      .from('asset_attribute_defs')
      .select('*')
      .eq('type_id', typeId)
      .order('name');

    if (error) throw error;
    return (data || []) as AssetAttributeDef[];
  }

  static async getAssetAttributes(assetId: string): Promise<AssetAttributeValue[]> {
    const { data, error } = await supabase
      .from('asset_attribute_values')
      .select(`
        *,
        definition:asset_attribute_defs(*)
      `)
      .eq('asset_id', assetId);

    if (error) throw error;
    return (data || []) as AssetAttributeValue[];
  }

  /**
   * Batch fetch asset attributes for many ids in a single query.
   * Returns a Map<assetId, AssetAttributeValue[]> so callers can group
   * client-side without an N+1 round-trip.
   */
  static async getAssetAttributesByIds(
    assetIds: string[]
  ): Promise<Map<string, AssetAttributeValue[]>> {
    const result = new Map<string, AssetAttributeValue[]>();
    if (assetIds.length === 0) return result;

    const { data, error } = await supabase
      .from('asset_attribute_values')
      .select(`
        *,
        definition:asset_attribute_defs(*)
      `)
      .in('asset_id', assetIds);

    if (error) throw error;
    for (const row of (data || []) as AssetAttributeValue[]) {
      const list = result.get(row.asset_id) ?? [];
      list.push(row);
      result.set(row.asset_id, list);
    }
    return result;
  }

  static async updateAssetAttributes(assetId: string, attributes: Record<string, any>): Promise<void> {
    // Get attribute definitions for validation
    const asset = await this.getAssetById(assetId);
    if (!asset) throw new Error('Asset not found');

    const defs = await this.getAssetAttributeDefinitions(asset.type_id);
    const defMap = new Map(defs.map(def => [def.name, def]));

    // Process each attribute
    for (const [name, value] of Object.entries(attributes)) {
      const def = defMap.get(name);
      if (!def) continue; // Skip unknown attributes

      // Prepare the value based on type
      const valueData: any = {
        asset_id: assetId,
        attr_def_id: def.id,
        value_text: null,
        value_number: null,
        value_date: null,
        value_bool: null,
        value_url: null
      };

      if (value !== null && value !== undefined && value !== '') {
        switch (def.data_type) {
          case 'text':
            valueData.value_text = String(value);
            break;
          case 'number':
            valueData.value_number = Number(value);
            break;
          case 'date':
            valueData.value_date = value;
            break;
          case 'boolean':
            valueData.value_bool = Boolean(value);
            break;
          case 'url':
            valueData.value_url = String(value);
            break;
        }
      }

      // Upsert the attribute value
      const { error } = await supabase
        .from('asset_attribute_values')
        .upsert(valueData, {
          onConflict: 'asset_id,attr_def_id'
        });

      if (error) throw error;
    }
  }

  // Asset Relationships
  static async getAssetRelationships(assetId: string): Promise<AssetRelationship[]> {
    const { data, error } = await supabase
      .from('asset_refs')
      .select('*')
      .eq('src_asset_id', assetId);

    if (error) throw error;

    // Fetch destination asset details separately
    const relationshipsWithAssets = await Promise.all(
      (data || []).map(async (rel: any) => {
        const { data: assetData } = await supabase
          .from('assets')
          .select(`
            id, label, asset_key, type_id, status_id, created_at, updated_at,
            type:asset_types(name),
            status:asset_statuses(name, colour)
          `)
          .eq('id', rel.dst_asset_id)
          .maybeSingle();

        return {
          ...rel,
          destination_asset: assetData
        };
      })
    );

    return relationshipsWithAssets as AssetRelationship[];
  }

  static async addAssetRelationship(
    srcAssetId: string,
    dstAssetId: string,
    relation: string
  ): Promise<void> {
    const { error } = await supabase
      .from('asset_refs')
      .insert({
        src_asset_id: srcAssetId,
        dst_asset_id: dstAssetId,
        relation,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) throw error;
  }

  static async removeAssetRelationship(relationshipId: string): Promise<void> {
    const { error } = await supabase
      .from('asset_refs')
      .delete()
      .eq('id', relationshipId);

    if (error) throw error;
  }

  // Asset History
  static async getAssetHistory(assetId: string): Promise<AssetHistory[]> {
    const { data, error } = await supabase
      .from('asset_history')
      .select(`
        id,
        asset_id,
        actor_user_id,
        action,
        before_data,
        after_data,
        created_at
      `)
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get actor details separately to avoid relation issues
    const historyWithActors = await Promise.all(
      (data || []).map(async (item) => {
        let actor = null;
        if (item.actor_user_id) {
          const { data: actorData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', item.actor_user_id)
            .maybeSingle();
          actor = actorData;
        }

        return {
          ...item,
          before_data: item.before_data as Record<string, any> | null,
          after_data: item.after_data as Record<string, any> | null,
          actor
        };
      })
    );

    return historyWithActors as AssetHistory[];
  }

  // Incident Linking
  static async linkAssetToIncident(assetId: string, incidentId: string): Promise<void> {
    const { error } = await supabase
      .rpc('link_asset_to_incident', {
        p_asset_id: assetId,
        p_incident_id: incidentId
      });

    if (error) throw error;
  }

  static async unlinkAssetFromIncident(assetId: string, incidentId: string): Promise<void> {
    const { error } = await supabase
      .from('incident_assets')
      .delete()
      .eq('asset_id', assetId)
      .eq('incident_id', incidentId);

    if (error) throw error;

    // Record history manually since we're not using the RPC
    const { error: historyError } = await supabase
      .rpc('record_asset_history', {
        p_asset_id: assetId,
        p_actor_id: (await supabase.auth.getUser()).data.user?.id,
        p_action: 'unlink_incident',
        p_after_data: JSON.stringify({ incident_id: incidentId })
      });

    if (historyError) console.warn('Failed to record history:', historyError);
  }

  // Get all assets linked to a specific incident
  static async getIncidentAssets(incidentId: string) {
    const { data, error } = await supabase
      .from('incident_assets')
      .select(`
        asset_id,
        linked_at,
        asset:assets(
          id,
          name,
          serial_number,
          asset_tag,
          status:asset_statuses(name, colour),
          type:asset_types(name)
        )
      `)
      .eq('incident_id', incidentId)
      .order('linked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getAssetIncidents(assetId: string) {
    const { data, error } = await supabase
      .from('incident_assets')
      .select(`
        incident_id,
        linked_at,
        incident:incidents(
          id,
          incident_number,
          title,
          status,
          priority:incident_priorities(name, colour),
          created_at
        )
      `)
      .eq('asset_id', assetId)
      .order('linked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Utility methods
  static formatAssetValue(value: AssetAttributeValue): string {
    const def = value.definition;
    if (!def) return '';

    switch (def.data_type) {
      case 'text':
        return value.value_text || '';
      case 'number':
        return value.value_number?.toString() || '';
      case 'date':
        return value.value_date ? new Date(value.value_date).toLocaleDateString('en-AU') : '';
      case 'boolean':
        return value.value_bool ? 'Yes' : 'No';
      case 'url':
        return value.value_url || '';
      default:
        return '';
    }
  }

  static isWarrantyExpiring(asset: Asset, days = 30): boolean {
    if (!asset.warranty_expiry) return false;

    const expiryDate = new Date(asset.warranty_expiry);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);

    return expiryDate <= warningDate;
  }
}
