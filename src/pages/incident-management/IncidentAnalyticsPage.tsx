import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDashboard } from "@/components/incidents/analytics/AnalyticsDashboard";
import { AIClassificationManager } from "@/components/incidents/analytics/AIClassificationManager";
import { BarChart3, Brain } from "lucide-react";

export default function IncidentAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Incident Analytics & Intelligence</h1>
        <p className="text-muted-foreground mt-2">
          Advanced analytics, AI insights, and predictive intelligence for incident management
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Classification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="ai">
          <AIClassificationManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}