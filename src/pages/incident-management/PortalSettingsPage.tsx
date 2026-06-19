import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutTemplate, FileText } from "lucide-react";
import RequestTypeManagement from "@/components/incidents/admin/RequestTypeManagement";
import PortalGroupManagement from "@/components/incidents/admin/PortalGroupManagement";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export default function PortalSettingsPage() {
  useRealtimeSubscription({ table: 'portal_groups', queryKeys: ['portal-groups'], channelName: 'rt-portal-groups' });
  useRealtimeSubscription({ table: 'portal_request_types', queryKeys: ['portal-request-types'], channelName: 'rt-portal-request-types' });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Portal Settings</h1>
        <p className="text-muted-foreground">
          Manage customer portal groups and request types
        </p>
      </div>

      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Portal Groups
          </TabsTrigger>
          <TabsTrigger value="request-types" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Request Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <PortalGroupManagement />
        </TabsContent>

        <TabsContent value="request-types">
          <RequestTypeManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
