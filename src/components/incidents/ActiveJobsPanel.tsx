import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyProjects } from "@/hooks/useIncidents";
import { useIncidentRealtime } from "@/hooks/useIncidentRealtime";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_PROJECT_COLOR = "#3b82f6";

export function ActiveJobsPanel() {
  const { data: projects, isLoading } = useMyProjects();
  const navigate = useNavigate();

  // Real-time updates so counts refresh automatically
  useIncidentRealtime();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Active Jobs</h2>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-12 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                  <div className="flex justify-between text-xs">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show ALL projects — sorted so those with open incidents come first
  const allProjects = (projects || [])
    .sort((a, b) => (b.open_incident_count || 0) - (a.open_incident_count || 0));

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalOpen = allProjects.reduce((sum, p) => sum + (p.open_incident_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Active Jobs</h2>
          <p className="text-sm text-muted-foreground">
            {allProjects.length} project{allProjects.length !== 1 ? 's' : ''} · {totalOpen} open incident{totalOpen !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last refreshed: {currentTime}
        </div>
      </div>

      {allProjects.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to any incident projects yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allProjects.map((project) => {
            const openCount = project.open_incident_count || 0;
            const hasOpen = openCount > 0;
            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border border-border shadow-sm hover:border-muted-foreground/30"
                onClick={() => navigate(`/incident-management/projects/${project.id}`)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Project Header */}
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs tracking-tight"
                        style={{ backgroundColor: project.icon_color || DEFAULT_PROJECT_COLOR }}
                      >
                        {project.project_key}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {project.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {project.project_key}
                        </Badge>
                      </div>
                    </div>

                    {/* Incident Count */}
                    <div className="text-center py-2">
                      {hasOpen ? (
                        <>
                          <div className="text-3xl font-bold text-orange-600">
                            {openCount}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Open Incidents
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-green-600">0</div>
                          <div className="text-sm text-muted-foreground">Open Incidents</div>
                        </>
                      )}
                    </div>

                    {/* Project Details */}
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {project.incident_count || 0} total
                      </div>
                      <div>
                        {project.lead
                          ? project.lead.full_name?.split(' ')[0] || project.lead.email.split('@')[0]
                          : 'No lead'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
