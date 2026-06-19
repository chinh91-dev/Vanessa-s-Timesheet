
import React, { useState, useMemo } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { TimeEntryFormValues } from "./schema";
import { useAuth } from "@/context/AuthContext";
import { useIncidents } from "@/hooks/useIncidents";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  status?: string;
  incident_project_id?: string;
}

interface IncidentSelectorProps {
  control: Control<TimeEntryFormValues>;
  onSelect: (incident: { id: string; incident_number: string; title: string } | null) => void;
  selectedIncidentId?: string;
  projectId?: string;
}

export const IncidentSelector: React.FC<IncidentSelectorProps> = ({
  control,
  onSelect,
  selectedIncidentId,
  projectId,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch incidents - filtering for active statuses only
  const { data: incidents = [], isLoading } = useIncidents({
    status: ['New', 'Triaged', 'In Progress'],
  });

  // Filter and format incidents for display
  const filteredIncidents = useMemo(() => {
    let result = incidents as Incident[];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (inc) =>
          inc.incident_number?.toLowerCase().includes(query) ||
          inc.title?.toLowerCase().includes(query)
      );
    }

    // Sort by incident_number descending (most recent first)
    return result.sort((a, b) => {
      const numA = parseInt(a.incident_number?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.incident_number?.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    }).slice(0, 50); // Limit to 50 for performance
  }, [incidents, searchQuery]);

  // Find selected incident
  const selectedIncident = useMemo(() => {
    return (incidents as Incident[]).find((inc) => inc.id === selectedIncidentId);
  }, [incidents, selectedIncidentId]);

  const handleSelect = (incident: Incident) => {
    if (incident.id === selectedIncidentId) {
      // Deselect if clicking the same item
      onSelect(null);
    } else {
      onSelect({
        id: incident.id,
        incident_number: incident.incident_number,
        title: incident.title,
      });
    }
    setOpen(false);
  };

  return (
    <FormField
      control={control}
      name="incident_id"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="font-medium">Select Incident*</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "w-full justify-between",
                    !selectedIncident && "text-muted-foreground"
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading incidents...
                    </span>
                  ) : selectedIncident ? (
                    <span className="truncate">
                      [{selectedIncident.incident_number}] {selectedIncident.title}
                    </span>
                  ) : (
                    "Search and select an incident..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search by incident number or title..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  {isLoading ? (
                    <div className="py-6 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading incidents...</p>
                    </div>
                  ) : filteredIncidents.length === 0 ? (
                    <CommandEmpty>
                      {searchQuery ? "No incidents found." : "No active incidents available."}
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredIncidents.map((incident) => (
                        <CommandItem
                          key={incident.id}
                          value={incident.id}
                          onSelect={() => handleSelect(incident)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedIncidentId === incident.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                {incident.incident_number}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {incident.status}
                              </span>
                            </div>
                            <p className="text-sm truncate mt-0.5">{incident.title}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
