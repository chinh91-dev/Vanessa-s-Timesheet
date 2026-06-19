import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, DollarSign, TrendingUp, Clock, Ticket } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Navigate } from 'react-router-dom';

interface DashboardData {
  slaPerformance: number;
  resolutionRate: number;
  monthlyInvoice: number;
  serviceCredits: number;
  netAmount: number;
  slaBreached: boolean;
  eligibleCredits: number;
  ticketDistribution: { priority: string; count: number; color: string }[];
  slaHistory: { month: string; performance: number }[];
}

export default function CustomerServiceDashboard() {
  const { user } = useCustomerAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.company_id) return;

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Fetch incidents for current month with priority info
      const { data: currentMonthIncidents } = await supabase
        .from('incidents')
        .select(`
          *,
          incident_project:incident_projects!inner(customer_id),
          priority:incident_priorities(id, name, color, resolution_sla_minutes)
        `)
        .eq('incident_project.customer_id', user.company_id)
        .gte('created_at', oneMonthAgo.toISOString());

      // Fetch incidents for last 6 months for history chart
      const { data: sixMonthIncidents } = await supabase
        .from('incidents')
        .select(`
          *,
          incident_project:incident_projects!inner(customer_id),
          priority:incident_priorities(resolution_sla_minutes)
        `)
        .eq('incident_project.customer_id', user.company_id)
        .gte('created_at', sixMonthsAgo.toISOString());

      // Fetch active contracts for billing
      const { data: contracts } = await supabase
        .from('contracts')
        .select('contract_value, billing_cadence')
        .eq('customer_id', user.company_id)
        .eq('is_active', true)
        .eq('status', 'active');

      // Calculate monthly invoice from contracts
      const monthlyInvoice = contracts?.reduce((sum, c) => {
        const value = Number(c.contract_value) || 0;
        // Adjust based on billing cadence if yearly/quarterly
        const cadence = c.billing_cadence?.toLowerCase() || 'monthly';
        if (cadence === 'yearly' || cadence === 'annual') {
          return sum + (value / 12);
        } else if (cadence === 'quarterly') {
          return sum + (value / 3);
        }
        return sum + value;
      }, 0) || 0;

      // Fetch pending service credits
      const { data: credits } = await supabase
        .from('service_credits')
        .select('credit_amount')
        .eq('customer_id', user.company_id)
        .eq('status', 'pending');

      const serviceCredits = credits?.reduce((sum, c) => sum + Number(c.credit_amount), 0) || 0;
      const netAmount = Math.max(0, monthlyInvoice - serviceCredits);

      // Calculate SLA Performance (current month)
      const totalIncidents = currentMonthIncidents?.length || 0;
      const metSLA = currentMonthIncidents?.filter(inc => {
        const resolutionSLA = (inc.priority as any)?.resolution_sla_minutes || 0;
        const resolutionTime = (inc as any).resolution_time_minutes;
        return resolutionTime && resolutionTime <= resolutionSLA;
      }).length || 0;
      const breachedCount = totalIncidents - metSLA;
      const slaPerformance = totalIncidents > 0 
        ? Math.round((metSLA / totalIncidents) * 1000) / 10 
        : 100;

      // Calculate Resolution Rate
      const resolvedCount = currentMonthIncidents?.filter(inc => 
        inc.status === 'Resolved' || inc.status === 'Closed'
      ).length || 0;
      const resolutionRate = totalIncidents > 0 
        ? Math.round((resolvedCount / totalIncidents) * 1000) / 10 
        : 100;

      // Fetch SLA agreements to calculate eligible credits
      const { data: slaAgreements } = await supabase
        .from('customer_sla_agreements')
        .select('service_credit_rate, monthly_service_fee')
        .eq('customer_id', user.company_id)
        .eq('is_active', true)
        .limit(1)
        .single();

      // Calculate eligible credits based on SLA breaches
      let eligibleCredits = 0;
      if (slaPerformance < 95 && slaAgreements) {
        const creditRate = Number(slaAgreements.service_credit_rate) || 0.05;
        const monthlyFee = Number(slaAgreements.monthly_service_fee) || monthlyInvoice;
        eligibleCredits = Math.round(monthlyFee * creditRate * breachedCount * 100) / 100;
      } else if (slaPerformance < 95) {
        // Default: 5% of monthly invoice per breach
        eligibleCredits = Math.round(monthlyInvoice * 0.05 * breachedCount * 100) / 100;
      }

      // Calculate Ticket Distribution by Priority
      const priorityCounts: Record<string, { count: number; color: string }> = {};
      currentMonthIncidents?.forEach(inc => {
        const priority = inc.priority as any;
        const name = priority?.name || 'Unknown';
        const color = priority?.color || '#6b7280';
        if (!priorityCounts[name]) {
          priorityCounts[name] = { count: 0, color };
        }
        priorityCounts[name].count++;
      });
      const ticketDistribution = Object.entries(priorityCounts).map(([priority, data]) => ({
        priority,
        count: data.count,
        color: data.color
      }));

      // Calculate SLA History (last 6 months)
      const monthlyData: Record<string, { total: number; metSLA: number; order: number }> = {};
      sixMonthIncidents?.forEach(inc => {
        const date = new Date(inc.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, metSLA: 0, order: date.getTime() };
        }
        monthlyData[monthKey].total++;
        
        const resolutionSLA = (inc.priority as any)?.resolution_sla_minutes || 0;
        const resolutionTime = (inc as any).resolution_time_minutes;
        if (resolutionTime && resolutionTime <= resolutionSLA) {
          monthlyData[monthKey].metSLA++;
        }
      });
      
      const slaHistory = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, data]) => {
          const [year, month] = monthKey.split('-');
          const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
          return {
            month: date.toLocaleString('default', { month: 'short' }),
            performance: data.total > 0 ? Math.round((data.metSLA / data.total) * 1000) / 10 : 100
          };
        });

      // Determine if SLA is breached (below 95%)
      const slaBreached = slaPerformance < 95;

      setData({
        slaPerformance,
        resolutionRate,
        monthlyInvoice: Math.round(monthlyInvoice * 100) / 100,
        serviceCredits: Math.round(serviceCredits * 100) / 100,
        netAmount: Math.round(netAmount * 100) / 100,
        slaBreached,
        eligibleCredits,
        ticketDistribution: ticketDistribution.length > 0 ? ticketDistribution : [
          { priority: 'No Data', count: 0, color: '#6b7280' }
        ],
        slaHistory: slaHistory.length > 0 ? slaHistory : [
          { month: 'No Data', performance: 100 }
        ]
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (user && user.role !== 'admin') {
    return <Navigate to="/customer-portal/my-tickets" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Unable to load dashboard data.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* SLA Breach Alert */}
      {data.slaBreached && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            <strong>SLA Performance Alert:</strong> Your current SLA performance is below target. 
            You are eligible for <strong>${data.eligibleCredits}</strong> in service credits.
          </AlertDescription>
        </Alert>
      )}

      {/* Monthly Billing Section */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-700">
            <DollarSign className="h-5 w-5" />
            <span>Monthly Billing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Invoice Amount</p>
              <p className="text-2xl font-bold text-blue-700">${data.monthlyInvoice.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Service Credits</p>
              <p className="text-2xl font-bold text-green-600">-${data.serviceCredits.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Net Amount</p>
              <p className="text-2xl font-bold">${data.netAmount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>SLA Performance</span>
            </CardTitle>
            <CardDescription>Current month performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{data.slaPerformance}%</span>
                <Badge variant={data.slaPerformance >= 95 ? "default" : "destructive"}>
                  {data.slaPerformance >= 95 ? "On Target" : "Below Target"}
                </Badge>
              </div>
              <Progress value={data.slaPerformance} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Target: 95% • Current: {data.slaPerformance}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>Resolution Rate</span>
            </CardTitle>
            <CardDescription>Tickets resolved on time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{data.resolutionRate}%</span>
                <Badge variant="default">Excellent</Badge>
              </div>
              <Progress value={data.resolutionRate} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Target: 95% • Current: {data.resolutionRate}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Tickets Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ticket className="h-5 w-5" />
              <span>Support Tickets by Priority</span>
            </CardTitle>
            <CardDescription>Current month distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.ticketDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SLA Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Performance Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.slaHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[90, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="performance" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}