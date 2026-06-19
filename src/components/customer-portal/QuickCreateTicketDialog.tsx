import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { IncidentService } from '@/lib/incident-service';
import type { IncidentProject } from '@/types/incident-types';

interface QuickCreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCreateTicketDialog({ open, onOpenChange }: QuickCreateTicketDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();

  const [issueText, setIssueText] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Fetch customer's incident projects
  const { data: projects = [] } = useQuery({
    queryKey: ['customer-incident-projects', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      
      const { data, error } = await supabase
        .from('incident_projects')
        .select('*')
        .eq('customer_id', user.company_id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as IncidentProject[];
    },
    enabled: !!user?.company_id && open
  });

  // Fetch priorities to get Medium as default
  const { data: priorities = [] } = useQuery({
    queryKey: ['incident-priorities'],
    queryFn: () => IncidentService.getPriorities(),
    enabled: open
  });

  // Auto-select project if only one exists
  React.useEffect(() => {
    if (projects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const defaultPriority = priorities.find(p => p.name === 'Medium') || priorities[0];
      const title = issueText.slice(0, 100).trim() || 'Quick Support Request';
      
      return await IncidentService.createIncident({
        title,
        description: issueText,
        impact_description: '',
        incident_project_id: selectedProjectId || projects[0]?.id || null,
        category_id: null,
        priority_id: defaultPriority?.id || null,
        assigned_to: null
      });
    },
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      
      toast({
        title: "Ticket Created",
        description: `Ticket #${incident.incident_number} has been submitted.`,
      });
      
      handleClose();
      navigate(`/customer-portal/my-tickets/${incident.id}`);
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Unable to create ticket. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleClose = () => {
    setIssueText('');
    setSelectedProjectId('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!issueText.trim()) return;
    createMutation.mutate();
  };

  const showProjectSelector = projects.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Submit Ticket
          </DialogTitle>
          <DialogDescription>
            Describe your issue and we'll create a ticket immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showProjectSelector && (
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="issue">What's the issue?</Label>
            <Textarea
              id="issue"
              placeholder="Describe your issue briefly..."
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!issueText.trim() || createMutation.isPending || (showProjectSelector && !selectedProjectId)}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Ticket
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
