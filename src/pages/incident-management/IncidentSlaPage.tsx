import { useState, useEffect, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Clock, Users, BarChart3, Target, CreditCard } from "lucide-react";
import { BusinessHoursManager } from "@/components/incidents/sla/BusinessHoursManager";
import { EscalationRulesManager } from "@/components/incidents/sla/EscalationRulesManager";
import { SlaReportDashboard } from "@/components/incidents/sla/SlaReportDashboard";
import { ProjectSlaManagement } from "@/components/incidents/admin/ProjectSlaManagement";
import { CustomerSlaAgreementManagement } from "@/components/incidents/admin/CustomerSlaAgreementManagement";
import { ServiceCreditsManagement } from "@/components/incidents/admin/ServiceCreditsManagement";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";

interface LazyTabContentProps {
  value: string;
  activeTab: string;
  children: ReactNode;
}

function LazyTabContent({ value, activeTab, children }: LazyTabContentProps) {
  const [hasBeenActive, setHasBeenActive] = useState(false);

  useEffect(() => {
    if (activeTab === value) {
      setHasBeenActive(true);
    }
  }, [activeTab, value]);

  if (!hasBeenActive) return null;
  return <>{children}</>;
}

export default function IncidentSlaPage() {
  const { userRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const isAdmin = userRole === "admin";

  if (loading) {
    return (
      <div className="container-responsive pt-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-lg" />
            <div className="space-y-2">
              <div className="h-9 w-64 bg-muted rounded" />
              <div className="h-4 w-96 bg-muted rounded" />
            </div>
          </div>
          <div className="h-10 w-full bg-muted rounded" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-responsive pt-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">You do not have access to this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive pt-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SLA Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure service level agreements, business hours, and project-based SLA rules
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            General SLA
          </TabsTrigger>
          <TabsTrigger value="project" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Project-Based SLA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <LazyTabContent value="general" activeTab={activeTab}>
            <div className="space-y-6">
              <BusinessHoursManager />
              <EscalationRulesManager />
              <SlaReportDashboard />
            </div>
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="project">
          <LazyTabContent value="project" activeTab={activeTab}>
            <div className="space-y-8">
              <ProjectSlaManagement />
              <CustomerSlaAgreementManagement />
              <ServiceCreditsManagement />
            </div>
          </LazyTabContent>
        </TabsContent>
      </Tabs>
    </div>
  );
}
