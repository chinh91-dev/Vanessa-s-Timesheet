import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Link, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchUserProjects } from "@/lib/timesheet/project-service";

interface TimesheetProjectSelectorProps {
  selectedProjectId?: string;
  onSelectProject: (projectId: string | null) => void;
  disabled?: boolean;
  containerClassName?: string;
  preventClose?: boolean;
}

const TimesheetProjectSelector = ({
  selectedProjectId,
  onSelectProject,
  disabled = false,
  containerClassName = "",
  preventClose = false,
}: TimesheetProjectSelectorProps) => {
  const [open, setOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['timesheet-projects', 'user'],
    queryFn: fetchUserProjects,
  });

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const handleInteraction = (e: React.MouseEvent) => {
    if (preventClose) e.stopPropagation();
  };

  return (
    <div className={containerClassName} onClick={handleInteraction}>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || isLoading}
              className="w-full justify-between font-normal"
            >
              <span className="flex items-center gap-2 truncate">
                <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                {selectedProject
                  ? <span className="truncate">{selectedProject.name}</span>
                  : <span className="text-muted-foreground">Select timesheet project...</span>
                }
              </span>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search timesheet projects..." />
              <CommandList>
                <CommandEmpty>No projects found.</CommandEmpty>
                <CommandGroup>
                  {selectedProjectId && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => { onSelectProject(null); setOpen(false); }}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear selection
                    </CommandItem>
                  )}
                  {projects?.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.name} ${project.description ?? ""}`}
                      onSelect={() => {
                        onSelectProject(project.id === selectedProjectId ? null : project.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("h-4 w-4 mr-2 shrink-0", project.id === selectedProjectId ? "opacity-100" : "opacity-0")}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{project.name}</span>
                        {project.description && (
                          <span className="text-xs text-muted-foreground truncate">{project.description}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TimesheetProjectSelector;
