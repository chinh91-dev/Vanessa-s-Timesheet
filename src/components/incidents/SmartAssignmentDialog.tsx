import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Users, Activity, Star, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SmartAssignmentService, type AssignmentCandidate, type SmartAssignmentRequest } from "@/lib/assignment/smart-assignment-service";

interface SmartAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: {
    id: string;
    title: string;
    incident_project_id?: string;
    priority_id?: string;
    category_id?: string;
  };
  onAssign: (userId: string, reason: string) => Promise<void>;
}

export function SmartAssignmentDialog({
  open,
  onOpenChange,
  incident,
  onAssign
}: SmartAssignmentDialogProps) {
  const [candidates, setCandidates] = useState<AssignmentCandidate[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<'smart' | 'round_robin' | 'workload_balanced' | 'skill_based'>('smart');
  const [requiredSkills, setRequiredSkills] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [assignmentReason, setAssignmentReason] = useState<string>('');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const request: SmartAssignmentRequest = {
        incident_id: incident.id,
        incident_project_id: incident.incident_project_id,
        priority_id: incident.priority_id,
        category_id: incident.category_id,
        required_skills: requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        assignment_strategy: selectedStrategy
      };

      const result = await SmartAssignmentService.assignIncident(request);
      
      if (result.success) {
        setCandidates(result.candidates);
        setSelectedCandidate(result.assigned_to || '');
        setAssignmentReason(result.assignment_reason);
        
        toast({
          title: "Analysis Complete",
          description: `Found ${result.candidates.length} potential assignees`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: result.error || "Unable to analyze assignment options",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Error",
        description: "Failed to analyze assignment candidates",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCandidate) {
      toast({
        title: "No Assignee Selected",
        description: "Please select a candidate to assign the incident to",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    try {
      await onAssign(selectedCandidate, assignmentReason);
      onOpenChange(false);
      
      toast({
        title: "Incident Assigned",
        description: "Smart assignment completed successfully",
      });
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign incident",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Assignment Analysis
          </DialogTitle>
          <DialogDescription>
            Analyze and assign incident: {incident.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Configuration</CardTitle>
              <CardDescription>
                Configure the smart assignment parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assignment Strategy</label>
                  <Select value={selectedStrategy} onValueChange={(value: any) => setSelectedStrategy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smart">Smart (AI-powered)</SelectItem>
                      <SelectItem value="workload_balanced">Workload Balanced</SelectItem>
                      <SelectItem value="skill_based">Skill-Based</SelectItem>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Required Skills (comma-separated)</label>
                  <Textarea
                    placeholder="e.g., Network Administration, Database Management"
                    value={requiredSkills}
                    onChange={(e) => setRequiredSkills(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Candidates...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Assignment Options
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Candidates List */}
          {candidates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assignment Candidates
                </CardTitle>
                <CardDescription>
                  Ranked by suitability score (higher is better)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {candidates.map((candidate, index) => (
                    <Card 
                      key={candidate.user_id}
                      className={`cursor-pointer transition-colors ${
                        selectedCandidate === candidate.user_id 
                          ? 'ring-2 ring-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedCandidate(candidate.user_id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Star className="h-4 w-4 text-yellow-500" />}
                              <div>
                                <div className="font-semibold">{candidate.user_name}</div>
                                <div className="text-sm text-muted-foreground">{candidate.user_email}</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Score */}
                            <div className="text-center">
                              <Badge variant={getScoreBadgeVariant(candidate.score)}>
                                {(candidate.score * 100).toFixed(0)}%
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">Score</div>
                            </div>

                            {/* Workload */}
                            <div className="text-center">
                              <div className="text-sm font-medium">{candidate.current_incidents}</div>
                              <div className="text-xs text-muted-foreground">Incidents</div>
                            </div>

                            {/* Availability */}
                            <div className="text-center">
                              {candidate.is_available ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {candidate.is_available ? 'Available' : 'Busy'}
                              </div>
                            </div>

                            {/* Average Resolution */}
                            <div className="text-center">
                              <div className="text-sm font-medium">
                                {candidate.avg_resolution_hours.toFixed(2)}h
                              </div>
                              <div className="text-xs text-muted-foreground">Avg Resolution</div>
                            </div>
                          </div>
                        </div>

                        {/* Matching Skills */}
                        {candidate.matching_skills.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium mb-2">Matching Skills:</div>
                            <div className="flex flex-wrap gap-1">
                              {candidate.matching_skills.map((skill) => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Score Breakdown */}
                        <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Workload: </span>
                            <span className={getScoreColor(candidate.workload_score)}>
                              {(candidate.workload_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Skills: </span>
                            <span className={getScoreColor(candidate.skill_score)}>
                              {(candidate.skill_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Available: </span>
                            <span className={getScoreColor(candidate.availability_score)}>
                              {(candidate.availability_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment Actions */}
          {candidates.length > 0 && (
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssign} 
                disabled={!selectedCandidate || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Assign to Selected
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}