import React, { useState, useEffect } from 'react';
import ErrorBoundary from '@/components/ohs/ErrorBoundary';
import { useAuth } from '@/context/AuthContext';
import { isManagerOrAbove } from '@/utils/roles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, ClipboardList, Users, Download, TrendingUp, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import HazardReportTab from '@/components/ohs/HazardReportTab';
import WorkplaceInspectionTab from '@/components/ohs/WorkplaceInspectionTab';
import InjuryRegisterTab from '@/components/ohs/InjuryRegisterTab';
import HRIncidentTab from '@/components/ohs/HRIncidentTab';
import OHSDashboard from '@/components/ohs/OHSDashboard';
import OHSNotificationCenter from '@/components/ohs/OHSNotificationCenter';
import OHSAdvancedReporting from '@/components/ohs/OHSAdvancedReporting';

const OHSPage = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hasOHSAccess, setHasOHSAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || loading) {
        setHasOHSAccess(null);
        return;
      }

      try {
        const hasAccess = await isManagerOrAbove(user);
        setHasOHSAccess(hasAccess);
      } catch (error) {
        console.error('Error checking OHS access:', error);
        setHasOHSAccess(false);
      }
    };

    checkAccess();
  }, [user, loading]);

  // Show loading state while checking access
  if (loading || hasOHSAccess === null) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-9 w-80 bg-muted rounded" />
              <div className="h-4 w-96 bg-muted rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 bg-muted rounded" />
              <div className="h-9 w-28 bg-muted rounded" />
            </div>
          </div>
          <div className="h-10 w-full bg-muted rounded" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hasOHSAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Access to the Occupational Health & Safety system is restricted to Managers and Administrators only.
              Please contact your supervisor if you need to report a workplace incident.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = async (type: 'csv' | 'pdf', tab: string) => {
    try {
      const { exportOHSData } = await import('@/lib/ohs-service');
      await exportOHSData(tab as 'hazards' | 'inspections' | 'injuries', type);
      toast({
        title: "Export Complete",
        description: `${type.toUpperCase()} export for ${tab} data has been prepared.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Occupational Health & Safety</h1>
          <p className="text-muted-foreground mt-2">
            Manage workplace safety through hazard reporting, inspections, and injury tracking
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv', activeTab)}
            className="hidden sm:flex"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('pdf', activeTab)}
            className="hidden sm:flex"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="hazards" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Hazards</span>
              </TabsTrigger>
              <TabsTrigger value="inspections" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Inspections</span>
              </TabsTrigger>
              <TabsTrigger value="injuries" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Injuries</span>
              </TabsTrigger>
              <TabsTrigger value="hr_incidents" className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                <span className="hidden sm:inline">HR Incidents</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <OHSDashboard />
            </TabsContent>

            <TabsContent value="hazards" className="space-y-6">
              <HazardReportTab />
            </TabsContent>

            <TabsContent value="inspections" className="space-y-6">
              <WorkplaceInspectionTab />
            </TabsContent>

            <TabsContent value="injuries" className="space-y-6">
              <InjuryRegisterTab />
            </TabsContent>

            <TabsContent value="hr_incidents" className="space-y-6">
              <HRIncidentTab />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <OHSAdvancedReporting />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="lg:col-span-1">
          <OHSNotificationCenter />
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default OHSPage;