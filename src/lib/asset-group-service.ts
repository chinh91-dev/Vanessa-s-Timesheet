import { supabase } from "@/integrations/supabase/client";
import { AssetGroup, CreateAssetGroupRequest, UpdateAssetGroupRequest } from "@/types/asset-types";

export class AssetGroupService {
  /**
   * Fetch all active asset groups
   */
  static async getAssetGroups(): Promise<AssetGroup[]> {
    const { data, error } = await supabase
      .from('asset_groups')
      .select(`
        *,
        customer:customers!asset_groups_customer_id_fkey(id, name),
        assets(count)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching asset groups:', error);
      throw new Error(`Failed to fetch asset groups: ${error.message}`);
    }

    const groups = (data || []).map((group: any) => ({
      ...group,
      asset_count: group.assets?.[0]?.count ?? 0,
    }));

    return groups as unknown as AssetGroup[];
  }

  /**
   * Fetch asset groups by customer
   */
  static async getAssetGroupsByCustomer(customerId: string): Promise<AssetGroup[]> {
    const { data, error } = await supabase
      .from('asset_groups')
      .select(`
        *,
        customer:customers!asset_groups_customer_id_fkey(id, name)
      `)
      .eq('is_active', true)
      .eq('customer_id', customerId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching asset groups by customer:', error);
      throw new Error(`Failed to fetch asset groups for customer: ${error.message}`);
    }

    return (data || []) as unknown as AssetGroup[];
  }

  /**
   * Create a new asset group
   */
  static async createAssetGroup(group: CreateAssetGroupRequest): Promise<AssetGroup> {
    const { data, error } = await supabase
      .from('asset_groups')
      .insert([{
        name: group.name,
        description: group.description,
        color: group.color || '#6366f1',
        customer_id: group.customer_id,
        sort_order: group.sort_order || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select(`
        *,
        customer:customers!asset_groups_customer_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating asset group:', error);
      throw new Error(`Failed to create asset group: ${error.message}`);
    }

    return data as unknown as AssetGroup;
  }

  /**
   * Update an existing asset group
   */
  static async updateAssetGroup(group: UpdateAssetGroupRequest): Promise<AssetGroup> {
    const { data, error } = await supabase
      .from('asset_groups')
      .update({
        name: group.name,
        description: group.description,
        color: group.color,
        customer_id: group.customer_id,
        sort_order: group.sort_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', group.id)
      .select(`
        *,
        customer:customers!asset_groups_customer_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Error updating asset group:', error);
      throw new Error(`Failed to update asset group: ${error.message}`);
    }

    return data as unknown as AssetGroup;
  }

  /**
   * Delete an asset group (soft delete by setting is_active to false)
   */
  static async deleteAssetGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('asset_groups')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting asset group:', error);
      throw new Error(`Failed to delete asset group: ${error.message}`);
    }
  }

  /**
   * Get asset group by ID
   */
  static async getAssetGroupById(id: string): Promise<AssetGroup | null> {
    const { data, error } = await supabase
      .from('asset_groups')
      .select(`
        *,
        customer:customers!asset_groups_customer_id_fkey(id, name)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Asset group not found
      }
      console.error('Error fetching asset group:', error);
      throw new Error(`Failed to fetch asset group: ${error.message}`);
    }

    return data as unknown as AssetGroup;
  }
}
