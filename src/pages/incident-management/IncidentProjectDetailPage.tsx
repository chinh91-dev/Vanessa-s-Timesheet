import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useIncidentProject, useIncidents, useAssignableUsers } from "@/hooks/useIncidents";
import { useIncidentRealtime } from "@/hooks/useIncidentRealtime";
import { useIncidentProjectRole } from "@/hooks/useIncidentProjectRole";
import {
  ArrowLeft,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Target,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateIncidentDialog } from "@/components/incidents/CreateIncidentDialog";
import { EditIncidentProjectDialog } from "@/components/incidents/EditIncidentProjectDialog";
import { ProjectSettingsForm } from "@/components/incidents/ProjectSettingsForm";
import { ChangeProjectLeadDialog } from "@/components/incidents/ChangeProjectLeadDialog";
import { IncidentProjectTeamTab } from "@/components/incidents/IncidentProjectTeamTab";
import { IncidentQueueTable } from "@/components/incidents/IncidentQueueTable";
import { IncidentQueueFilters, useProjectStatusDefault, ALL_STATUSES } from "@/components/incidents/IncidentQueueFilters";
import type { IncidentStatus, IncidentFilters } from "@/types/incident-types";

export default function IncidentProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [changeLeadDialogOpen, setChangeLeadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filter state — multi-select statuses with per-project default stored in localStorage
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useProjectStatusDefault(id);
  const [selectedAssignee, setSelectedAssignee] = useState("all");

  const { data: project, isLoading: projectLoading } = useIncidentProject(id!);
  const { data: assignableUsers } = useAssignableUsers();
  const { isAdmin } = useIncidentProjectRole(id!);

  // Enable real-time updates for this project
  useIncidentRealtime({ projectId: id });

  // Build filters — fetch all statuses then filter client-side for flexibility
  const filters = useMemo((): IncidentFilters => {
    const baseFilters: IncidentFilters = { incident_project_id: id };
    if (searchTerm) baseFilters.search = searchTerm;
    if (selectedAssignee !== "all" && selectedAssignee !== "unassigned") {
      baseFilters.assigned_to = selectedAssignee;
    }
    return baseFilters;
  }, [id, searchTerm, selectedAssignee]);

  const { data: incidents = [], isLoading: incidentsLoading } = useIncidents(filters);

  // Filter by selected statuses and unassigned locally
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUSES.length) {
      result = result.filter((i) => selectedStatuses.includes(i.status as IncidentStatus));
    }
    if (selectedAssignee === "unassigned") {
      result = result.filter((i) => !i.assigned_to);
    }
    return result;
  }, [incidents, selectedStatuses, selectedAssignee]);

  const openIncidents = filteredIncidents.filter(inc => !['Resolved', 'Closed'].includes(inc.status));
  const closedIncidents = filteredIncidents.filter(inc => ['Resolved', 'Closed'].includes(inc.status));

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container-responsive py-4">
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <div className="container-responsive py-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container-responsive pt-6">
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Project not found</h3>
          <p className="text-muted-foreground mb-4">
            The incident project you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/incident-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb Header */}
      <div className="border-b bg-card">
        <div className="container-responsive py-3">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
            <Link 
              to="/incident-management" 
              className="hover:text-foreground transition-colors"
            >
              Projects
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{project.name}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Queue</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs tracking-tight"
                style={{ backgroundColor: project.icon_color || "#3b82f6" }}
              >
                {project.project_key}
              </div>
              <div>
                <h1 className="text-xl font-semibold">All open tickets</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-1.5" />
                  Settings
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-responsive py-6">
        <Tabs defaultValue="incidents" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="incidents">
              Queue ({filteredIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="incidents" className="space-y-4">
            <IncidentQueueFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedStatuses={selectedStatuses}
              onStatusChange={setSelectedStatuses}
              selectedAssignee={selectedAssignee}
              onAssigneeChange={setSelectedAssignee}
              itemCount={filteredIncidents.length}
              onCreateClick={() => setCreateDialogOpen(true)}
              assignees={assignableUsers}
              projectId={id}
            />
            
            <IncidentQueueTable
              incidents={filteredIncidents}
              isLoading={incidentsLoading}
            />
          </TabsContent>
          
          <TabsContent value="overview">
            <div className="grid gap-6">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Open Issues</p>
                        <p className="text-2xl font-bold">{openIncidents.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                        <p className="text-2xl font-bold">{closedIncidents.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                        <p className="text-2xl font-bold">{filteredIncidents.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Users className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Project Lead</p>
                          <p className="text-sm font-semibold">
                            {project.lead?.full_name || project.lead?.email || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setChangeLeadDialogOpen(true)}
                      >
                        Change
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Project Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Project Key</p>
                      <p className="font-mono font-semibold">{project.project_key}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Project Lead</p>
                      <p>{project.lead?.full_name || project.lead?.email || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p>{new Date(project.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={project.is_active ? "default" : "secondary"}>
                        {project.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {project.customer && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Customer</p>
                        <p>{project.customer.name}</p>
                        {project.customer.company && (
                          <p className="text-xs text-muted-foreground">{project.customer.company}</p>
                        )}
                      </div>
                    )}
                    {project.timesheet_project && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Linked Timesheet Project</p>
                        <p>{project.timesheet_project.name}</p>
                        {project.timesheet_project.description && (
                          <p className="text-xs text-muted-foreground">{project.timesheet_project.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {project.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                      <p className="text-sm leading-relaxed">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="team">
            <IncidentProjectTeamTab 
              projectId={id!} 
              projectLeadId={project.lead_id} 
            />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
                <CardDescription>
                  Configure project details and integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectSettingsForm project={project} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {project && (
        <>
          <EditIncidentProjectDialog
            project={project}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
          <ChangeProjectLeadDialog
            project={project}
            open={changeLeadDialogOpen}
            onOpenChange={setChangeLeadDialogOpen}
          />
          <CreateIncidentDialog 
            open={createDialogOpen} 
            onOpenChange={setCreateDialogOpen}
            defaultProjectId={id}
          />
        </>
      )}
    </div>
  );
}