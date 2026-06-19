import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, AlertTriangle, CheckCircle, Zap, Target, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useIncidentProjects } from "@/hooks/useIncidents";
import { CreateIncidentProjectDialog } from "@/components/incidents/CreateIncidentProjectDialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DEFAULT_PROJECT_COLOR = "#3b82f6";

export default function IncidentManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: projects, isLoading } = useIncidentProjects();
  const navigate = useNavigate();

  const filteredProjects = projects?.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.project_key.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalProjects = projects?.length || 0;
  const totalOpenIncidents = projects?.reduce((sum, p) => sum + (p.open_incident_count || 0), 0) || 0;
  const totalIncidents = projects?.reduce((sum, p) => sum + (p.incident_count || 0), 0) || 0;
  const activeProjects = projects?.filter(p => (p.open_incident_count || 0) > 0).length || 0;

  if (isLoading) {
    return (
      <div className="container-responsive pt-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-9 w-14 mb-2" />
                <Skeleton className="h-3.5 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <div className="divide-y">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1 max-w-xs" />
                <Skeleton className="h-5 w-16 rounded-full ml-auto" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive pt-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-t-2 border-t-primary">
          <CardContent className="p-5">
            <p className="text-3xl font-bold">{totalProjects}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Total Projects
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-orange-500">
          <CardContent className="p-5">
            <p className="text-3xl font-bold text-orange-500">{totalOpenIncidents}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" /> Open Incidents
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-green-500">
          <CardContent className="p-5">
            <p className="text-3xl font-bold text-green-500">{totalIncidents - totalOpenIncidents}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Resolved
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-blue-500">
          <CardContent className="p-5">
            <p className="text-3xl font-bold">{activeProjects}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Active Projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Incident Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage projects and track issues across your organisation
          </p>
        </div>
        <CreateIncidentProjectDialog>
          <Button size="sm" className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </CreateIncidentProjectDialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
        <Input
          placeholder="Search by name or key..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchTerm("")}
          >
            ×
          </Button>
        )}
      </div>
      {searchTerm && (
        <p className="text-xs text-muted-foreground -mt-2">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""} matching "{searchTerm}"
        </p>
      )}

      {/* Projects Table */}
      <Card>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm
                ? `No projects match "${searchTerm}"`
                : "Create your first incident project to get started"}
            </p>
            <CreateIncidentProjectDialog>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CreateIncidentProjectDialog>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map(project => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/incident-management/projects/${project.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: project.icon_color || DEFAULT_PROJECT_COLOR }}
                      >
                        {project.project_key.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {project.project_key}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.lead ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {(project.lead.full_name || project.lead.email)
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {project.lead.full_name?.split(" ")[0] ||
                            project.lead.email.split("@")[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(project.open_incident_count || 0) > 0 ? (
                      <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20">
                        {project.open_incident_count} open
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-600 border border-green-500/20">
                        All resolved
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/incident-management/projects/${project.id}`);
                          }}
                        >
                          View project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
