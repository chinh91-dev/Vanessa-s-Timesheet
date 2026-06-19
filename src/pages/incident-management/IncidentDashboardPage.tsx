import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, CheckCircle, Zap, User, Target, MoreHorizontal } from "lucide-react";
import { useMyAssignedIncidents } from "@/hooks/useIncidents";
import { useIncidentRealtime } from "@/hooks/useIncidentRealtime";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  "New": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Triaged": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "In Progress": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Resolved": "bg-green-500/10 text-green-600 border-green-500/20",
  "Closed": "bg-muted text-muted-foreground border-muted",
};

export default function IncidentDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: incidents = [], isLoading } = useMyAssignedIncidents();
  const navigate = useNavigate();

  useIncidentRealtime();

  const filteredIncidents = incidents.filter(incident =>
    incident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.incident_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAssigned = incidents.length;
  const openIncidents = incidents.filter(i => !["Closed", "Resolved"].includes(i.status)).length;
  const resolvedIncidents = incidents.filter(i => i.status === "Resolved").length;
  const inProgress = incidents.filter(i => i.status === "In Progress").length;

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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 flex-1 max-w-sm" />
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
            <p className="text-3xl font-bold">{totalAssigned}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> My Assigned
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-orange-500">
          <CardContent className="p-5">
            <p className="text-3xl font-bold text-orange-500">{openIncidents}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" /> Open
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-yellow-500">
          <CardContent className="p-5">
            <p className="text-3xl font-bold text-yellow-500">{inProgress}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-500" /> In Progress
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-green-500">
          <CardContent className="p-5">
            <p className="text-3xl font-bold text-green-500">{resolvedIncidents}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Incidents assigned to you</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
        <Input
          placeholder="Search incidents..."
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
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? "s" : ""} matching "{searchTerm}"
        </p>
      )}

      {/* Incidents Table */}
      <Card>
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-16">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No incidents found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? `No incidents match "${searchTerm}"`
                : "You don't have any incidents assigned yet"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.map(incident => (
                <TableRow
                  key={incident.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/incident-management/projects/${incident.incident_project_id}`)}
                >
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {incident.incident_number}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="font-medium truncate">{incident.title}</p>
                      {incident.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {incident.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`border ${STATUS_COLORS[incident.status] || "bg-muted"}`}>
                      {incident.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {incident.priority && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: incident.priority.color,
                          color: incident.priority.color,
                        }}
                      >
                        {incident.priority.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {incident.incident_project && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {incident.incident_project.project_key}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(incident.created_at), "MMM d, yyyy")}
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
                            navigate(`/incident-management/projects/${incident.incident_project_id}`);
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
