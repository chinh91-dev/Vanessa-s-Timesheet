import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Trash2, Plus, Clock } from "lucide-react";
import { useIncidentProjects, useIncidentPriorities } from "@/hooks/useIncidents";
import { 
  useProjectSlaConfigs, 
  useDeleteProjectSlaConfig 
} from "@/hooks/useProjectAdvanced";
import { ProjectSlaConfigDialog } from "./ProjectSlaConfigDialog";
import { useToast } from "@/hooks/use-toast";
import type { ProjectSlaConfig } from "@/types/project-types";

export function ProjectSlaManagement() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ProjectSlaConfig | null>(null);

  const { data: projects, isLoading: projectsLoading } = useIncidentProjects();
  const { data: priorities } = useIncidentPriorities();
  const { data: slaConfigs, isLoading: configsLoading } = useProjectSlaConfigs(selectedProject);
  const deleteConfig = useDeleteProjectSlaConfig();
  const { toast } = useToast();

  // Enrich slaConfigs with priority data
  const enrichedConfigs = slaConfigs?.map(config => ({
    ...config,
    priority: priorities?.find(p => p.id === config.priority_id)
  }));

  const handleConfigSuccess = () => {
    setIsConfigDialogOpen(false);
    setEditingConfig(null);
    toast({
      title: "Success",
      description: "SLA configuration saved successfully",
    });
  };

  const handleDeleteConfig = async (configId: string) => {
    try {
      await deleteConfig.mutateAsync(configId);
      toast({
        title: "Success",
        description: "SLA configuration deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete SLA configuration",
        variant: "destructive",
      });
    }
  };

  const handleEditConfig = (config: ProjectSlaConfig) => {
    setEditingConfig(config);
    setIsConfigDialogOpen(true);
  };

  const handleCreateConfig = () => {
    setEditingConfig(null);
    setIsConfigDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Project SLA Configuration
          </CardTitle>
          <CardDescription>
            Configure Service Level Agreement settings for incident projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Project</label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project to configure SLA..." />
                </SelectTrigger>
                <SelectContent>
                  {projectsLoading ? (
                    <SelectItem value="" disabled>Loading projects...</SelectItem>
                  ) : (
                    projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        [{project.project_key}] {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedProject && (
              <Button onClick={handleCreateConfig} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add SLA Config
              </Button>
            )}
          </div>

          {/* SLA Configurations Table */}
          {selectedProject && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  SLA Configurations for {projects?.find(p => p.id === selectedProject)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {configsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading configurations...
                  </div>
                ) : enrichedConfigs && enrichedConfigs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Priority</TableHead>
                        <TableHead>Response SLA</TableHead>
                        <TableHead>Resolution SLA</TableHead>
                        <TableHead>Escalation Time</TableHead>
                        <TableHead>Business Hours Only</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrichedConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: config.priority?.color || '#666' }}
                              />
                              {config.priority?.name || 'Unknown Priority'}
                            </div>
                          </TableCell>
                          <TableCell>{config.response_sla_hours}h</TableCell>
                          <TableCell>{config.resolution_sla_hours}h</TableCell>
                          <TableCell>{config.escalation_hours ? `${config.escalation_hours}h` : 'None'}</TableCell>
                          <TableCell>
                            <Badge variant={config.business_hours_only ? "default" : "secondary"}>
                              {config.business_hours_only ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditConfig(config)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteConfig(config.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No SLA configurations found for this project.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first SLA configuration to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* SLA Configuration Dialog */}
      <ProjectSlaConfigDialog
        projectId={selectedProject}
        config={editingConfig}
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        onSuccess={handleConfigSuccess}
      />
    </div>
  );
}
