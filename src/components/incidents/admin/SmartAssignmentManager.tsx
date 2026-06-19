import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Settings, BarChart3, Zap } from "lucide-react";
import { AIClassificationManager } from "@/components/incidents/analytics/AIClassificationManager";

export function SmartAssignmentManager() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Smart Assignment Management</h2>
            <p className="text-muted-foreground">
              Configure AI-powered incident assignment algorithms and rules
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="ai-classification" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-classification" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Classification
          </TabsTrigger>
          <TabsTrigger value="assignment-rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Assignment Rules
          </TabsTrigger>
          <TabsTrigger value="algorithm-config" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Algorithm Config
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-classification">
          <AIClassificationManager />
        </TabsContent>

        <TabsContent value="assignment-rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Assignment Rules
              </CardTitle>
              <CardDescription>
                Auto-assignment rule configuration is not yet available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                This feature is not yet configured in the database.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="algorithm-config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Algorithm Configuration
              </CardTitle>
              <CardDescription>
                Algorithm weight configuration is not yet available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                This feature is not yet configured in the database.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance
              </CardTitle>
              <CardDescription>
                Assignment performance metrics are not yet available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                No performance data available yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}