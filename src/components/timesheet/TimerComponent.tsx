import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Play, Pause, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { saveTimesheetEntry, Project, fetchUserProjects, Contract, fetchUserContracts } from "@/lib/timesheet-service";
import { formatDate } from "@/lib/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const TimerComponent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [entryType, setEntryType] = useState<'project' | 'contract'>('project');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchUserProjects,
    enabled: !!user && entryType === 'project'
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["user-contracts"],
    queryFn: fetchUserContracts,
    enabled: !!user && entryType === 'contract'
  });

  const formattedTime = () => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleEntryTypeChange = (value: string) => {
    const newEntryType = value as 'project' | 'contract';
    setEntryType(newEntryType);
    // Clear selections when switching types
    setSelectedProject(null);
    setSelectedContract(null);
  };

  const startTimer = () => {
    const hasSelection = entryType === 'project' ? selectedProject : selectedContract;
    
    if (!hasSelection) {
      toast({
        title: "Selection Required",
        description: `Please select a ${entryType} before starting the timer.`,
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    const startTime = new Date();
    setTimerStartTime(startTime);
    
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  };

  const stopTimer = async () => {
    if (!user || !timerStartTime) return;
    
    const hasSelection = entryType === 'project' ? selectedProject : selectedContract;
    if (!hasSelection) return;
    
    pauseTimer();
    const hoursLogged = parseFloat((elapsedTime / 3600).toFixed(2));
    const today = new Date();
    
    try {
      const entryData = {
        entry_type: entryType,
        entry_date: formatDate(today),
        hours_logged: hoursLogged,
        notes: `Timer Entry - please change. Duration: ${formattedTime()}`,
        ...(entryType === 'project' 
          ? { project_id: selectedProject } 
          : { contract_id: selectedContract }
        )
      };

      await saveTimesheetEntry(entryData);
      
      toast({
        title: "Time Saved",
        description: `${formattedTime()} logged to the selected ${entryType}.`
      });
      
      setElapsedTime(0);
      setTimerStartTime(null);
    } catch (error) {
      console.error("Error saving timer entry:", error);
      toast({
        title: "Error",
        description: "Failed to save time entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const currentSelection = entryType === 'project' ? selectedProject : selectedContract;
  const hasItems = entryType === 'project' ? projects.length > 0 : contracts.length > 0;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <span>Time Tracker</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-4">
            {/* Entry Type Selection */}
            <div className="space-y-2">
              <Label className="font-medium">Track Time For*</Label>
              <RadioGroup
                value={entryType}
                onValueChange={handleEntryTypeChange}
                className="flex flex-row space-x-6"
                disabled={isRunning}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="project" id="timer-project" />
                  <Label htmlFor="timer-project">Project</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contract" id="timer-contract" />
                  <Label htmlFor="timer-contract">Contract</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Project Selector */}
            {entryType === 'project' && (
              <Select
                value={selectedProject || ""}
                onValueChange={setSelectedProject}
                disabled={isRunning}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Contract Selector */}
            {entryType === 'contract' && (
              <Select
                value={selectedContract || ""}
                onValueChange={setSelectedContract}
                disabled={isRunning}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select a contract" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract: Contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <div className="flex items-center justify-center py-2">
              <div className="text-3xl sm:text-4xl font-mono font-bold">
                {formattedTime()}
              </div>
            </div>
            
            {/* Fixed button container with proper spacing and sizing */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 px-2">
              {!isRunning ? (
                <Button 
                  onClick={startTimer} 
                  className="bg-green-600 hover:bg-green-700 h-11 px-4 flex-1 sm:flex-none sm:min-w-[140px]"
                  disabled={!currentSelection || !hasItems}
                >
                  <Play className="mr-2 h-4 w-4" /> Start Timer
                </Button>
              ) : (
                <Button 
                  onClick={pauseTimer} 
                  className="bg-amber-500 hover:bg-amber-600 h-11 px-4 flex-1 sm:flex-none sm:min-w-[140px]"
                >
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
              )}
              
              <Button 
                onClick={stopTimer} 
                variant="destructive"
                disabled={elapsedTime === 0}
                className="h-11 px-4 flex-1 sm:flex-none sm:min-w-[140px]"
              >
                <StopCircle className="mr-2 h-4 w-4" /> Stop & Save
              </Button>
            </div>

            {!hasItems && (
              <p className="text-sm text-gray-500 text-center px-2">
                No {entryType}s available. You can only track time for {entryType}s you're assigned to.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimerComponent;
