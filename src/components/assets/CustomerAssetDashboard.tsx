import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Package, AlertTriangle, TrendingUp } from "lucide-react";
import { AssetService } from "@/lib/asset-service";
import { AssetGroupService } from "@/lib/asset-group-service";
import type { Customer } from "@/lib/customer-service";
import type { Asset, AssetGroup } from "@/types/asset-types";

interface CustomerAssetDashboardProps {
  customer: Customer;
}

interface CustomerAssetStats {
  totalAssets: number;
  assetsByStatus: Record<string, number>;
  assetsByType: Record<string, number>;
  warningAssets: number;
  recentAssets: Asset[];
  customerGroups: AssetGroup[];
}

export function CustomerAssetDashboard({ customer }: CustomerAssetDashboardProps) {
  const [stats, setStats] = useState<CustomerAssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomerAssetStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load customer-specific asset groups and all assets
        const [customerGroups, allAssetsResult] = await Promise.all([
          AssetGroupService.getAssetGroupsByCustomer(customer.id),
          AssetService.getAssets({}, 1, 1000) // Get all assets for analysis
        ]);

        // Filter assets that belong to customer groups
        const customerGroupIds = customerGroups.map(g => g.id);
        const customerAssets = allAssetsResult.assets.filter(asset => 
          asset.group_id && customerGroupIds.includes(asset.group_id)
        );

        // Calculate statistics
        const assetsByStatus: Record<string, number> = {};
        const assetsByType: Record<string, number> = {};
        let warningAssets = 0;

        customerAssets.forEach(asset => {
          // Count by status
          if (asset.status?.name) {
            assetsByStatus[asset.status.name] = (assetsByStatus[asset.status.name] || 0) + 1;
          }
          
          // Count by type
          if (asset.type?.name) {
            assetsByType[asset.type.name] = (assetsByType[asset.type.name] || 0) + 1;
          }
          
          // Check for warnings (warranty expiring)
          if (AssetService.isWarrantyExpiring(asset)) {
            warningAssets++;
          }
        });

        // Get recent assets (last 5)
        const recentAssets = customerAssets
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);

        setStats({
          totalAssets: customerAssets.length,
          assetsByStatus,
          assetsByType,
          warningAssets,
          recentAssets,
          customerGroups
        });

      } catch (err) {
        console.error('Failed to load customer asset stats:', err);
        setError('Failed to load asset statistics');
      } finally {
        setLoading(false);
      }
    };

    loadCustomerAssetStats();
  }, [customer.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">{customer.name}</h2>
          <p className="text-muted-foreground">
            {customer.company && `${customer.company} • `}
            {stats.totalAssets} assets managed
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{stats.totalAssets}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asset Groups</p>
                <p className="text-2xl font-bold">{stats.customerGroups.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Warranty Alerts</p>
                <p className="text-2xl font-bold">{stats.warningAssets}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${stats.warningAssets > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asset Types</p>
                <p className="text-2xl font-bold">{Object.keys(stats.assetsByType).length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.assetsByStatus).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.assetsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm">{status}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No assets found</p>
            )}
          </CardContent>
        </Card>

        {/* Asset Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.assetsByType).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.assetsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No assets found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Asset Groups */}
      {stats.customerGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.customerGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Assets */}
      {stats.recentAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {asset.asset_key}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{asset.label}</p>
                      <p className="text-xs text-muted-foreground">{asset.type?.name}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{asset.status?.name}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}