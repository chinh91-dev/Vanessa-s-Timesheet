import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Edit, Trash2, Clock, User, ArrowUp } from "lucide-react";
import { EnhancedSlaService, type EscalationRule } from "@/lib/enhanced-sla-service";
import { useIncidentPriorities, useIncidentCategories, useIncidentProjects, useAssignableUsers } from "@/hooks/useIncidents";
import { useToast } from "@/hooks/use-toast";

const slaService = new EnhancedSlaService();

interface EscalationRuleFormData {
  name: string;
  description: string;
  incident_project_id: string;
  priority_id: string;
  category_id: string;
  trigger_after_minutes: number;
  escalate_to_user_id: string;
  escalate_to_role: string;
  escalation_message: string;
  notify_original_assignee: boolean;
  notify_escalation_target: boolean;
  auto_reassign: boolean;
  is_active: boolean;
  sort_order: number;
}

const defaultFormData: EscalationRuleFormData = {
  name: "",
  description: "",
  incident_project_id: "",
  priority_id: "",
  category_id: "",
  trigger_after_minutes: 60,
  escalate_to_user_id: "",
  escalate_to_role: "",
  escalation_message: "",
  notify_original_assignee: true,
  notify_escalation_target: true,
  auto_reassign: false,
  is_active: true,
  sort_order: 0
};

const escalationRoles = [
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
  { value: "lead", label: "Team Lead" }
];

export function EscalationRulesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState<EscalationRuleFormData>(defaultFormData);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: priorities } = useIncidentPriorities();
  const { data: categories } = useIncidentCategories();
  const { data: projects } = useIncidentProjects();
  const { data: users } = useAssignableUsers();

  const { data: rawEscalationRules, isLoading, isError, error } = useQuery({
    queryKey: ['escalation-rules'],
    queryFn: () => slaService.getEscalationRules(),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Map priority_id and category_id to cached data client-side
  const escalationRules = useMemo(() => {
    if (!rawEscalationRules) return [];
    
    const priorityMap = new Map(priorities?.map(p => [p.id, p]) || []);
    const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);
    
    return rawEscalationRules.map(rule => ({
      ...rule,
      priority: rule.priority_id ? priorityMap.get(rule.priority_id) : null,
      category: rule.category_id ? categoryMap.get(rule.category_id) : null
    }));
  }, [rawEscalationRules, priorities, categories]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<EscalationRule, 'id' | 'created_at' | 'updated_at'>) => 
      slaService.createEscalationRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Escalation rule created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating escalation rule", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EscalationRule> }) => 
      slaService.updateEscalationRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      setIsDialogOpen(false);
      setEditingRule(null);
      setFormData(defaultFormData);
      toast({ title: "Escalation rule updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating escalation rule", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => slaService.deleteEscalationRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      toast({ title: "Escalation rule deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting escalation rule", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      incident_project_id: formData.incident_project_id || null,
      priority_id: formData.priority_id || null,
      category_id: formData.category_id || null,
      escalate_to_user_id: formData.escalate_to_user_id || null,
      escalate_to_role: (formData.escalate_to_role as 'manager' | 'admin' | 'lead') || null
    };
    
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || "",
      incident_project_id: rule.incident_project_id || "",
      priority_id: rule.priority_id || "",
      category_id: rule.category_id || "",
      trigger_after_minutes: rule.trigger_after_minutes,
      escalate_to_user_id: rule.escalate_to_user_id || "",
      escalate_to_role: rule.escalate_to_role || "",
      escalation_message: rule.escalation_message || "",
      notify_original_assignee: rule.notify_original_assignee,
      notify_escalation_target: rule.notify_escalation_target,
      auto_reassign: rule.auto_reassign,
      is_active: rule.is_active,
      sort_order: rule.sort_order
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this escalation rule?")) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingRule(null);
  };

  const formatTriggerTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours}h ${remainingMinutes}m`
        : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading escalation rules...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Failed to load escalation rules</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Escalation Rules</h2>
          <p className="text-sm text-muted-foreground">
            Configure automatic escalation when SLAs are at risk
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Escalation Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Escalation Rule" : "Create Escalation Rule"}
              </DialogTitle>
              <DialogDescription>
                Define when and how incidents should be escalated
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trigger_after_minutes">Trigger After (minutes) *</Label>
                  <Input
                    id="trigger_after_minutes"
                    type="number"
                    min="1"
                    value={formData.trigger_after_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, trigger_after_minutes: parseInt(e.target.value, 10) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="incident_project_id">Project (Optional)</Label>
                  <Select
                    value={formData.incident_project_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, incident_project_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any project</SelectItem>
                      {projects?.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority_id">Priority (Optional)</Label>
                  <Select
                    value={formData.priority_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any priority</SelectItem>
                      {priorities?.map(priority => (
                        <SelectItem key={priority.id} value={priority.id}>
                          {priority.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category_id">Category (Optional)</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any category</SelectItem>
                      {categories?.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="escalate_to_user_id">Escalate to User</Label>
                  <Select
                    value={formData.escalate_to_user_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, escalate_to_user_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific user</SelectItem>
                      {users?.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="escalate_to_role">Or Escalate to Role</Label>
                  <Select
                    value={formData.escalate_to_role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, escalate_to_role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific role</SelectItem>
                      {escalationRoles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="escalation_message">Escalation Message</Label>
                <Textarea
                  id="escalation_message"
                  value={formData.escalation_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, escalation_message: e.target.value }))}
                  placeholder="Custom message to include in escalation notification"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="notify-original"
                    checked={formData.notify_original_assignee}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_original_assignee: checked }))}
                  />
                  <Label htmlFor="notify-original">Notify original assignee</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="notify-escalation"
                    checked={formData.notify_escalation_target}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_escalation_target: checked }))}
                  />
                  <Label htmlFor="notify-escalation">Notify escalation target</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-reassign"
                    checked={formData.auto_reassign}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_reassign: checked }))}
                  />
                  <Label htmlFor="auto-reassign">Automatically reassign incident</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is-active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingRule ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {escalationRules?.length === 0 && (
          <div className="p-8 text-center border border-dashed rounded-lg">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No escalation rules found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first escalation rule to automatically escalate incidents
            </p>
          </div>
        )}
        {escalationRules?.map((rule) => (
          <Card key={rule.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  {!rule.is_active && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {rule.description && (
                <CardDescription>{rule.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Triggers after: <strong>{formatTriggerTime(rule.trigger_after_minutes)}</strong></span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Conditions:</span>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {rule.incident_project?.name && (
                        <li>• Project: {rule.incident_project.name}</li>
                      )}
                      {rule.priority?.name && (
                        <li>• Priority: {rule.priority.name}</li>
                      )}
                      {rule.category?.name && (
                        <li>• Category: {rule.category.name}</li>
                      )}
                      {!rule.incident_project?.name && !rule.priority?.name && !rule.category?.name && (
                        <li className="text-muted-foreground">• All incidents</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <span className="font-medium">Escalation Target:</span>
                    <div className="mt-1 space-y-1 text-muted-foreground">
                      {rule.escalate_to_user && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {rule.escalate_to_user.full_name}
                        </div>
                      )}
                      {rule.escalate_to_role && (
                        <div className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" />
                          {escalationRoles.find(r => r.value === rule.escalate_to_role)?.label}
                        </div>
                      )}
                      {!rule.escalate_to_user && !rule.escalate_to_role && (
                        <span className="text-muted-foreground">No specific target</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 text-xs">
                  {rule.notify_original_assignee && (
                    <Badge variant="outline">Notify Original</Badge>
                  )}
                  {rule.notify_escalation_target && (
                    <Badge variant="outline">Notify Target</Badge>
                  )}
                  {rule.auto_reassign && (
                    <Badge variant="outline">Auto Reassign</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}