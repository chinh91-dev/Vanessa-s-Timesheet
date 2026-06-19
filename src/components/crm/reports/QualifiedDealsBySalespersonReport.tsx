import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeType, getAustralianFYLabel } from "@/lib/crm/financial-year-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { UserCheck, Users, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface QualifiedDealsBySalespersonReportProps {
  financialYear: DateRangeType;
}

interface QualifiedMetrics {
  totalQualified: number;
  totalFirstTimeQualified: number;
  bySalesperson: {
    id: string;
    name: string;
    qualified: number;
    firstTimeQualified: number;
    totalValue: number;
  }[];
}

export const QualifiedDealsBySalespersonReport = forwardRef<any, QualifiedDealsBySalespersonReportProps>(({
  financialYear,
}, ref) => {
  const [metrics, setMetrics] = useState<QualifiedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getExportData: () => metrics
  }));

  useEffect(() => {
    const fetchQualifiedMetrics = async () => {
      setIsLoading(true);
      try {
        // Get the "Qualified" stage ID
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("id, name")
          .ilike("name", "%qualified%");

        const qualifiedStageIds = stages?.map(s => s.id) || [];

        if (qualifiedStageIds.length === 0) {
          setMetrics({
            totalQualified: 0,
            totalFirstTimeQualified: 0,
            bySalesperson: []
          });
          setIsLoading(false);
          return;
        }

        // Fetch existing customer names from the customers table
        const { data: existingCustomers } = await supabase
          .from("customers")
          .select("name");

        // Create a Set of lowercase customer names for efficient lookup
        const existingCustomerNames = new Set(
          existingCustomers?.map(c => c.name?.toLowerCase().trim()).filter(Boolean) || []
        );

        // Fetch deals in Qualified stage within the FY
        const { data: deals, error } = await supabase
          .from("deals")
          .select(`
            id,
            amount,
            contract_value,
            created_at,
            primary_contact_id,
            owner:owner_id(id, full_name),
            pipeline_stage:pipeline_stage_id(id, name)
          `)
          .in("pipeline_stage_id", qualifiedStageIds)
          .gte("created_at", format(financialYear.from, "yyyy-MM-dd"))
          .lte("created_at", format(financialYear.to, "yyyy-MM-dd'T'23:59:59"));

        if (error) {
          console.error("Error fetching deals:", error);
          setMetrics(null);
          return;
        }

        // Get all deals per contact to determine first-time qualification
        const contactIds = [...new Set(deals?.filter(d => d.primary_contact_id).map(d => d.primary_contact_id))];
        
        let contactDealsCount: { [key: string]: number } = {};
        let contactCompanyNames: { [key: string]: string } = {};
        
        if (contactIds.length > 0) {
          // Fetch contact details including company_name
          const { data: contacts } = await supabase
            .from("contacts")
            .select("id, company_name")
            .in("id", contactIds);

          contacts?.forEach((c: any) => {
            if (c.company_name) {
              contactCompanyNames[c.id] = c.company_name;
            }
          });

          const { data: allDeals } = await supabase
            .from("deals")
            .select("id, primary_contact_id, created_at")
            .in("primary_contact_id", contactIds)
            .order("created_at", { ascending: true });

          // Count deals per contact and track first deal
          const contactFirstDeal: { [key: string]: string } = {};
          allDeals?.forEach((d: any) => {
            if (d.primary_contact_id) {
              contactDealsCount[d.primary_contact_id] = (contactDealsCount[d.primary_contact_id] || 0) + 1;
              if (!contactFirstDeal[d.primary_contact_id]) {
                contactFirstDeal[d.primary_contact_id] = d.id;
              }
            }
          });

          // Update contactDealsCount to store first deal ID
          Object.keys(contactFirstDeal).forEach(cid => {
            contactDealsCount[`first_${cid}`] = contactFirstDeal[cid] as any;
          });
        }

        // Group by salesperson
        const bySalesperson: { [key: string]: { name: string; qualified: number; firstTimeQualified: number; totalValue: number } } = {};
        let totalFirstTimeQualified = 0;

        deals?.forEach((deal: any) => {
          const ownerId = deal.owner?.id || 'unknown';
          const ownerName = deal.owner?.full_name || 'Unknown';
          const dealValue = Number(deal.contract_value) || Number(deal.amount) || 0;
          
          if (!bySalesperson[ownerId]) {
            bySalesperson[ownerId] = { name: ownerName, qualified: 0, firstTimeQualified: 0, totalValue: 0 };
          }
          
          bySalesperson[ownerId].qualified++;
          bySalesperson[ownerId].totalValue += dealValue;

          // Check if this is first-time qualification:
          // 1. Must be first deal for this contact
          // 2. Contact's company_name must NOT exist in customers table
          const contactId = deal.primary_contact_id;
          if (contactId && contactDealsCount[`first_${contactId}`] === deal.id) {
            const companyName = contactCompanyNames[contactId];
            const isExistingCustomer = companyName && existingCustomerNames.has(companyName.toLowerCase().trim());
            
            if (!isExistingCustomer) {
              bySalesperson[ownerId].firstTimeQualified++;
              totalFirstTimeQualified++;
            }
          }
        });

        const bySalespersonArray = Object.entries(bySalesperson).map(([id, data]) => ({
          id,
          ...data,
        }));

        setMetrics({
          totalQualified: deals?.length || 0,
          totalFirstTimeQualified,
          bySalesperson: bySalespersonArray,
        });
      } catch (error) {
        console.error("Error calculating qualified metrics:", error);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQualifiedMetrics();
  }, [financialYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Qualified Deals by Salesperson</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Qualified Deals by Salesperson - {getAustralianFYLabel(financialYear.from)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Deals entering "Qualified" stage, with first-time contact qualification tracking
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual Dashboard</TabsTrigger>
            <TabsTrigger value="tabular">Detailed Data</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <UserCheck className="h-4 w-4" />
                    Total Qualified
                  </div>
                  <p className="text-3xl font-bold">{metrics?.totalQualified || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    First-Time Qualified
                  </div>
                  <p className="text-3xl font-bold">{metrics?.totalFirstTimeQualified || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    New prospects (not existing customers)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Salespeople Active
                  </div>
                  <p className="text-3xl font-bold">{metrics?.bySalesperson.length || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Qualified Deals by Salesperson</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    qualified: {
                      label: "Qualified",
                      color: "hsl(var(--primary))",
                    },
                    firstTimeQualified: {
                      label: "First-Time",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={metrics?.bySalesperson.sort((a, b) => b.qualified - a.qualified)} 
                      layout="vertical"
                      margin={{ left: 20, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        width={120}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="qualified" 
                        fill="hsl(var(--primary))" 
                        name="Total Qualified"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar 
                        dataKey="firstTimeQualified" 
                        fill="hsl(var(--chart-2))" 
                        name="First-Time"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Salesperson Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics?.bySalesperson
                .sort((a, b) => b.qualified - a.qualified)
                .map((person) => (
                  <Card key={person.id}>
                    <CardContent className="pt-6">
                      <p className="font-medium text-lg">{person.name}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Qualified</span>
                          <span className="font-bold">{person.qualified}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">First-Time</span>
                          <span className="font-bold">{person.firstTimeQualified}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Value</span>
                          <span className="font-bold">${person.totalValue.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="tabular">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Qualified Deals Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Salesperson</th>
                        <th className="text-right p-2">Total Qualified</th>
                        <th className="text-right p-2">First-Time Qualified</th>
                        <th className="text-right p-2">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics?.bySalesperson
                        .sort((a, b) => b.qualified - a.qualified)
                        .map((person) => (
                          <tr key={person.id} className="border-b">
                            <td className="p-2">{person.name}</td>
                            <td className="text-right p-2">{person.qualified}</td>
                            <td className="text-right p-2">{person.firstTimeQualified}</td>
                            <td className="text-right p-2">${person.totalValue.toLocaleString()}</td>
                          </tr>
                        ))}
                      <tr className="font-bold bg-muted/50">
                        <td className="p-2">Total</td>
                        <td className="text-right p-2">{metrics?.totalQualified || 0}</td>
                        <td className="text-right p-2">{metrics?.totalFirstTimeQualified || 0}</td>
                        <td className="text-right p-2">
                          ${(metrics?.bySalesperson.reduce((sum, p) => sum + p.totalValue, 0) || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
