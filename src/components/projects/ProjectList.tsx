
import React, { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Play, Pause, Building2, Users } from "lucide-react";
import { Project } from "@/lib/timesheet/types";
import { formatDateDisplay } from "@/lib/date-utils";
import ProjectBudgetDisplay from "./ProjectBudgetDisplay";

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onToggleStatus: (project: Project) => void;
  onManageAssignments: (project: Project) => void;
}

const ProjectList = ({ projects, onEdit, onDelete, onToggleStatus, onManageAssignments }: ProjectListProps) => {
  const lastLeftClickTime = useRef<number>(0);
  const lastLeftClickedProject = useRef<string | null>(null);

  const handleDoubleLeftClick = (project: Project, event: React.MouseEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastLeftClickTime.current;
    
    // Check if this is a double left-click (within 500ms and same project)
    if (timeDiff < 500 && lastLeftClickedProject.current === project.id) {
      onEdit(project);
      lastLeftClickTime.current = 0; // Reset to prevent triple clicks
      lastLeftClickedProject.current = null;
    } else {
      lastLeftClickTime.current = currentTime;
      lastLeftClickedProject.current = project.id;
    }
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No projects found matching your criteria.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card 
          key={project.id} 
          className={`hover:shadow-md transition-shadow cursor-pointer ${
            project.is_internal 
              ? 'text-white border-white/10' 
              : ''
          }`}
          style={project.is_internal ? { 
            background: 'linear-gradient(to bottom right, #0f133e, #0a0d27)' 
          } : undefined}
          onClick={(e) => handleDoubleLeftClick(project, e)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className={`text-lg truncate ${project.is_internal ? 'text-white' : ''}`}>
                  {project.name}
                </CardTitle>
                <CardDescription className={`mt-1 ${project.is_internal ? 'text-white/80' : ''}`}>
                  {project.description || "No description provided"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {project.is_internal && (
                  <Badge variant="secondary" className={`flex items-center gap-1 ${project.is_internal ? 'bg-white/20 text-white border-white/30' : ''}`}>
                    <Building2 className="h-3 w-3" />
                    Internal
                  </Badge>
                )}
                {!project.is_active && (
                  <Badge variant="outline" className={project.is_internal ? 'border-white/30 text-white/90' : ''}>Inactive</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <ProjectBudgetDisplay project={project} isInternal={project.is_internal} />
            
            {(project.start_date || project.end_date) && (
              <div className={`text-sm ${project.is_internal ? 'text-white/70' : 'text-muted-foreground'}`}>
                {project.start_date && (
                  <div>Start: {formatDateDisplay(new Date(project.start_date))}</div>
                )}
                {project.end_date && (
                  <div>End: {formatDateDisplay(new Date(project.end_date))}</div>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={project.is_internal ? 'bg-transparent border-white/30 text-white hover:!bg-transparent hover:!text-white' : ''}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                 <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageAssignments(project);
                  }}
                  className={project.is_internal ? 'bg-transparent border-white/30 text-white hover:!bg-transparent hover:!text-white' : ''}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(project);
                  }}
                  className={
                    project.is_internal 
                      ? 'bg-transparent border-white/30 text-white hover:!bg-transparent hover:!text-white' 
                      : project.is_active ? "text-amber-600" : "text-green-600"
                  }
                >
                  {project.is_active ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project);
                  }}
                  className={
                    project.is_internal 
                      ? 'bg-transparent border-white/30 text-white hover:!bg-transparent hover:!text-white' 
                      : "text-red-600 hover:text-red-700"
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProjectList;
