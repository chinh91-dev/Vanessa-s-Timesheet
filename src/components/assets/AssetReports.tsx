import React, { useState, useEffect } from "react";
import { BarChart3, AlertTriangle, DollarSign, TrendingUp, Package, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetService } from "@/lib/asset-service";
import type { Asset } from "@/types/asset-types";

interface AssetReportsProps {
  className?: string;
  selectedCustomer?: Customer | null;
}

interface Customer {
  id: string;
  name: string;
}

interface WarrantyReport {
  expired: Asset[];
  expiringSoon: Asset[];
  expiringLater: Asset[];
}

interface CostAnalysis {
  totalValue: number;
  averageCost: number;
  topValueAssets: Asset[];
  costByType: { typeName: string; totalCost: number; count: number }[];
}

interface UtilizationReport {
  totalAssets: number;
  activeAssets: number;
  retiredAssets: number;
  unassignedAssets: number;
  utilizationByType: { typeName: string; active: number; total: number }[];
}

export function AssetReports({ className, selectedCustomer }: AssetReportsProps) {
  const [loading, setLoading] = useState(true);
  const [warrantyReport, setWarrantyReport] = useState<WarrantyReport | null>(null);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  const [utilizationReport, setUtilizationReport] = useState<UtilizationReport | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Get all assets
      const response = await AssetService.getAssets({}, 1, 10000);
      const assets = response.assets;
      
      // Generate warranty report
      generateWarrantyReport(assets);
      
      // Generate cost analysis
      generateCostAnalysis(assets);
      
      // Generate utilization report
      generateUtilizationReport(assets);
      
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWarrantyReport = (assets: Asset[]) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    const assetsWithWarranty = assets.filter(asset => asset.warranty_expiry);
    
    const expired = assetsWithWarranty.filter(asset => 
      new Date(asset.warranty_expiry!) < now
    );
    
    const expiringSoon = assetsWithWarranty.filter(asset => {
      const expiryDate = new Date(asset.warranty_expiry!);
      return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
    });
    
    const expiringLater = assetsWithWarranty.filter(asset => {
      const expiryDate = new Date(asset.warranty_expiry!);
      return expiryDate > thirtyDaysFromNow && expiryDate <= ninetyDaysFromNow;
    });

    setWarrantyReport({ expired, expiringSoon, expiringLater });
  };

  const generateCostAnalysis = (assets: Asset[]) => {
    const assetsWithCost = assets.filter(asset => asset.cost && asset.cost > 0);
    
    const totalValue = assetsWithCost.reduce((sum, asset) => sum + (asset.cost || 0), 0);
    const averageCost = totalValue / assetsWithCost.length || 0;
    
    const topValueAssets = assetsWithCost
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 10);
    
    // Group by type
    const costByTypeMap = new Map<string, { totalCost: number; count: number }>();
    assetsWithCost.forEach(asset => {
      const typeName = asset.type?.name || 'Unknown';
      const existing = costByTypeMap.get(typeName) || { totalCost: 0, count: 0 };
      costByTypeMap.set(typeName, {
        totalCost: existing.totalCost + (asset.cost || 0),
        count: existing.count + 1
      });
    });
    
    const costByType = Array.from(costByTypeMap.entries()).map(([typeName, data]) => ({
      typeName,
      ...data
    })).sort((a, b) => b.totalCost - a.totalCost);

    setCostAnalysis({ totalValue, averageCost, topValueAssets, costByType });
  };

  const generateUtilizationReport = (assets: Asset[]) => {
    const totalAssets = assets.length;
    const activeAssets = assets.filter(asset => 
      !asset.status?.is_terminal && 
      !asset.status?.name.toLowerCase().includes('retired') &&
      !asset.status?.name.toLowerCase().includes('disposed')
    ).length;
    const retiredAssets = totalAssets - activeAssets;
    const unassignedAssets = assets.filter(asset => !asset.device_user_id).length;

    // Utilization by type
    const utilizationMap = new Map<string, { active: number; total: number }>();
    assets.forEach(asset => {
      const typeName = asset.type?.name || 'Unknown';
      const existing = utilizationMap.get(typeName) || { active: 0, total: 0 };
      const isActive = !asset.status?.is_terminal && 
                      !asset.status?.name.toLowerCase().includes('retired') &&
                      !asset.status?.name.toLowerCase().includes('disposed');
      
      utilizationMap.set(typeName, {
        active: existing.active + (isActive ? 1 : 0),
        total: existing.total + 1
      });
    });

    const utilizationByType = Array.from(utilizationMap.entries()).map(([typeName, data]) => ({
      typeName,
      ...data
    })).sort((a, b) => b.total - a.total);

    setUtilizationReport({ totalAssets, activeAssets, retiredAssets, unassignedAssets, utilizationByType });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <BarChart3 className="h-8 w-8 animate-pulse mr-3" />
          <span>Loading asset reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold">Asset Reports & Analytics</h2>
        <p className="text-muted-foreground">
          Comprehensive insights into your asset inventory and utilization.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="warranty">Warranty</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{utilizationReport?.totalAssets || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{utilizationReport?.activeAssets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {utilizationReport ? Math.round((utilizationReport.activeAssets / utilizationReport.totalAssets) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(costAnalysis?.totalValue || 0)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warranty Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {(warrantyReport?.expired.length || 0) + (warrantyReport?.expiringSoon.length || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Expired or expiring soon
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Alerts */}
          <div className="space-y-4">
            {warrantyReport && warrantyReport.expired.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{warrantyReport.expired.length} assets</strong> have expired warranties and may need attention.
                </AlertDescription>
              </Alert>
            )}
            
            {warrantyReport && warrantyReport.expiringSoon.length > 0 && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <strong>{warrantyReport.expiringSoon.length} assets</strong> have warranties expiring within 30 days.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* Warranty Tab */}
        <TabsContent value="warranty" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Expired Warranties ({warrantyReport?.expired.length || 0})
                </CardTitle>
                <CardDescription>
                  Assets with warranties that have already expired
                </CardDescription>
              </CardHeader>
              <CardContent>
                {warrantyReport?.expired.length ? (
                  <div className="space-y-2">
                    {warrantyReport.expired.slice(0, 10).map(asset => (
                      <div key={asset.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{asset.asset_key}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{asset.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-600">
                            Expired {formatDate(asset.warranty_expiry!)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {warrantyReport.expired.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        ... and {warrantyReport.expired.length - 10} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No expired warranties found
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  Expiring Soon ({warrantyReport?.expiringSoon.length || 0})
                </CardTitle>
                <CardDescription>
                  Assets with warranties expiring in the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {warrantyReport?.expiringSoon.length ? (
                  <div className="space-y-2">
                    {warrantyReport.expiringSoon.map(asset => (
                      <div key={asset.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{asset.asset_key}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{asset.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-yellow-600">
                            Expires {formatDate(asset.warranty_expiry!)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No warranties expiring soon
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                    <div className="text-2xl font-bold">{formatCurrency(costAnalysis?.totalValue || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Average Cost</div>
                    <div className="text-xl font-semibold">{formatCurrency(costAnalysis?.averageCost || 0)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost by Asset Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {costAnalysis?.costByType.slice(0, 5).map(type => (
                      <div key={type.typeName} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{type.typeName}</span>
                          <span className="font-medium">{formatCurrency(type.totalCost)}</span>
                        </div>
                        <Progress 
                          value={(type.totalCost / (costAnalysis.totalValue || 1)) * 100} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {type.count} assets
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Value Assets</CardTitle>
                <CardDescription>
                  Most expensive assets in your inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {costAnalysis?.topValueAssets.slice(0, 10).map((asset, index) => (
                    <div key={asset.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-6 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <span className="font-medium">{asset.asset_key}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{asset.label}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(asset.cost || 0)}</div>
                        <div className="text-xs text-muted-foreground">{asset.type?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Utilization Tab */}
        <TabsContent value="utilization" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Utilization Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{utilizationReport?.totalAssets || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Assets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{utilizationReport?.activeAssets || 0}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{utilizationReport?.retiredAssets || 0}</div>
                    <div className="text-sm text-muted-foreground">Retired</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{utilizationReport?.unassignedAssets || 0}</div>
                    <div className="text-sm text-muted-foreground">Unassigned</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Utilization by Asset Type</CardTitle>
                <CardDescription>
                  Active vs. total assets by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {utilizationReport?.utilizationByType.map(type => {
                    const utilizationRate = (type.active / type.total) * 100;
                    return (
                      <div key={type.typeName} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{type.typeName}</span>
                          <span>{type.active} / {type.total} active ({Math.round(utilizationRate)}%)</span>
                        </div>
                        <Progress value={utilizationRate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}