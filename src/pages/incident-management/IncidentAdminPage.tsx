import { useState, useEffect, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertTriangle, FileText, Brain, Award, Activity, Bell, GitBranch, List } from "lucide-react";
import { PriorityManagement } from "@/components/incidents/admin/PriorityManagement";
import { TemplateManagement } from "@/components/incidents/admin/TemplateManagement";
import { WorkloadDashboard } from "@/components/incidents/WorkloadDashboard";
import { SkillMatrixManager } from "@/components/incidents/SkillMatrixManager";
import { EscalationChainBuilder } from "@/components/incidents/EscalationChainBuilder";
import { AssignmentQueueManagement } from "@/components/incidents/AssignmentQueueManagement";
import { AssignmentNotifications } from "@/components/incidents/AssignmentNotifications";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// Lazy tab content - only renders when tab has been visited
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
  
  if (!hasBeenActive) {
    return null;
  }
  
  return <>{children}</>;
}

export default function IncidentAdminPage() {
  const { userRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("priorities");
  const isAdmin = userRole === "admin";

  useRealtimeSubscription({ table: 'incident_priorities', queryKeys: ['incident-priorities'], channelName: 'rt-admin-priorities', enabled: isAdmin });
  useRealtimeSubscription({ table: 'incident_templates', queryKeys: ['incident-templates'], channelName: 'rt-admin-templates', enabled: isAdmin });

  // Show loading state while auth is being checked
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

  // Return proper UI if user is not admin
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
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Incident Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure incident management system settings and templates
            </p>
          </div>
        </div>
      </div>

      {/* Admin Tabs - Controlled */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="priorities" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Priorities
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="workload" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Workload
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skills Matrix
            </TabsTrigger>
          </TabsList>

          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="escalation-chains" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Escalation Chains
            </TabsTrigger>
            <TabsTrigger value="assignment-queue" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Assignment Queue
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="smart-assignment" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Smart Assignment
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="priorities">
          <LazyTabContent value="priorities" activeTab={activeTab}>
            <PriorityManagement />
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="templates">
          <LazyTabContent value="templates" activeTab={activeTab}>
            <TemplateManagement />
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="workload">
          <LazyTabContent value="workload" activeTab={activeTab}>
            <WorkloadDashboard />
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="skills">
          <LazyTabContent value="skills" activeTab={activeTab}>
            <SkillMatrixManager />
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="escalation-chains">
          <LazyTabContent value="escalation-chains" activeTab={activeTab}>
            <EscalationChainBuilder />
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="assignment-queue">
          <LazyTabContent value="assignment-queue" activeTab={activeTab}>
            <AssignmentQueueManagement />
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="notifications">
          <LazyTabContent value="notifications" activeTab={activeTab}>
            <AssignmentNotifications />
          </LazyTabContent>
        </TabsContent>

        <TabsContent value="smart-assignment">
          <LazyTabContent value="smart-assignment" activeTab={activeTab}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <WorkloadDashboard />
              </div>
              <div>
                <SkillMatrixManager />
              </div>
            </div>
          </LazyTabContent>
        </TabsContent>

      </Tabs>
    </div>
  );
}
