import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, User, Users, ChevronDown, ChevronUp, Save, Edit } from "lucide-react";
import { useIncidentPriorities, useIncidentCategories, useIncidentProjects, useAssignableUsers } from "@/hooks/useIncidents";
import { 
  useEscalationChains, 
  useCreateEscalationChain, 
  useUpdateEscalationChain, 
  useDeleteEscalationChain,
  type EscalationLevel,
  type EscalationChain 
} from "@/hooks/useEscalationChains";

interface EscalationChainBuilderProps {
  chainId?: string;
  onChainSaved?: () => void;
}

interface LocalEscalationLevel extends Omit<EscalationLevel, 'level'> {
  id: string;
  level?: number;
}

interface LocalEscalationChain {
  id?: string;
  name: string;
  description?: string;
  incident_project_id?: string;
  priority_id?: string;
  category_id?: string;
  is_active: boolean;
  auto_escalate_minutes: number;
  notify_on_escalation: boolean;
  levels: LocalEscalationLevel[];
}

export function EscalationChainBuilder({ chainId, onChainSaved }: EscalationChainBuilderProps = {}) {
  const [chain, setChain] = useState<LocalEscalationChain>({
    name: "",
    description: "",
    is_active: true,
    auto_escalate_minutes: 240,
    notify_on_escalation: true,
    levels: []
  });
  const [selectedChainId, setSelectedChainId] = useState<string>(chainId || "");
  const [isEditing, setIsEditing] = useState(!chainId);

  const { data: priorities } = useIncidentPriorities();
  const { data: categories } = useIncidentCategories();
  const { data: projects } = useIncidentProjects();
  const { data: users } = useAssignableUsers();
  const { data: escalationChains } = useEscalationChains();
  const createChain = useCreateEscalationChain();
  const updateChain = useUpdateEscalationChain();
  const deleteChain = useDeleteEscalationChain();

  // Load selected chain data when chainId or selectedChainId changes
  useEffect(() => {
    if (selectedChainId && escalationChains) {
      const existingChain = escalationChains.find(c => c.id === selectedChainId);
      if (existingChain) {
        setChain({
          id: existingChain.id,
          name: existingChain.name,
          description: existingChain.description || "",
          incident_project_id: existingChain.incident_project_id,
          priority_id: existingChain.priority_id,
          category_id: existingChain.category_id,
          is_active: existingChain.is_active,
          auto_escalate_minutes: existingChain.auto_escalate_minutes,
          notify_on_escalation: existingChain.notify_on_escalation,
          levels: existingChain.chain_levels.map((level, index) => ({
            ...level,
            id: `level-${index}`,
          }))
        });
        setIsEditing(false);
      }
    }
  }, [selectedChainId, escalationChains]);

  const addLevel = () => {
    const newLevel: LocalEscalationLevel = {
      id: `level-${Date.now()}`,
      name: `Level ${chain.levels.length + 1}`,
      triggerAfterMinutes: (chain.levels.length + 1) * 60,
      autoReassign: false,
      notifyEscalationTarget: true,
      notifyOriginalAssignee: true
    };
    setChain(prev => ({
      ...prev,
      levels: [...prev.levels, newLevel]
    }));
  };

  const removeLevel = (levelId: string) => {
    setChain(prev => ({
      ...prev,
      levels: prev.levels.filter(l => l.id !== levelId)
    }));
  };

  const updateLevel = (levelId: string, updates: Partial<LocalEscalationLevel>) => {
    setChain(prev => ({
      ...prev,
      levels: prev.levels.map(l => 
        l.id === levelId ? { ...l, ...updates } : l
      )
    }));
  };

  const handleSave = async () => {
    const chainData: Omit<EscalationChain, 'id' | 'created_at' | 'updated_at'> = {
      name: chain.name,
      description: chain.description,
      incident_project_id: chain.incident_project_id,
      priority_id: chain.priority_id,
      category_id: chain.category_id,
      is_active: chain.is_active,
      auto_escalate_minutes: chain.auto_escalate_minutes,
      notify_on_escalation: chain.notify_on_escalation,
      chain_levels: chain.levels.map((level, index) => ({
        level: index + 1,
        name: level.name,
        triggerAfterMinutes: level.triggerAfterMinutes,
        escalateToUserId: level.escalateToUserId,
        escalateToRole: level.escalateToRole,
        autoReassign: level.autoReassign,
        notifyEscalationTarget: level.notifyEscalationTarget,
        notifyOriginalAssignee: level.notifyOriginalAssignee,
        escalationMessage: level.escalationMessage,
      }))
    };

    if (chain.id) {
      await updateChain.mutateAsync({ id: chain.id, ...chainData });
    } else {
      const newChain = await createChain.mutateAsync(chainData);
      setSelectedChainId(newChain.id);
      setChain(prev => ({ ...prev, id: newChain.id }));
    }
    
    setIsEditing(false);
    onChainSaved?.();
  };

  const handleDelete = async () => {
    if (chain.id) {
      await deleteChain.mutateAsync(chain.id);
      setChain({
        name: "",
        description: "",
        is_active: true,
        auto_escalate_minutes: 240,
        notify_on_escalation: true,
        levels: []
      });
      setSelectedChainId("");
      setIsEditing(true);
    }
  };

  const handleNewChain = () => {
    setChain({
      name: "",
      description: "",
      is_active: true,
      auto_escalate_minutes: 240,
      notify_on_escalation: true,
      levels: []
    });
    setSelectedChainId("");
    setIsEditing(true);
  };

  const moveLevel = (levelId: string, direction: 'up' | 'down') => {
    const currentIndex = chain.levels.findIndex(l => l.id === levelId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === chain.levels.length - 1)
    ) {
      return;
    }

    const newLevels = [...chain.levels];
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newLevels[currentIndex], newLevels[newIndex]] = [newLevels[newIndex], newLevels[currentIndex]];

    setChain(prev => ({ ...prev, levels: newLevels }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Escalation Chain Configuration</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleNewChain} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Chain
              </Button>
              {chain.id && !isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chain Selector */}
          <div className="space-y-2">
            <Label>Select Existing Chain</Label>
            <Select value={selectedChainId} onValueChange={setSelectedChainId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an escalation chain to edit" />
              </SelectTrigger>
              <SelectContent>
                {escalationChains?.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id!}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chain Name</Label>
              <Input
                value={chain.name}
                onChange={(e) => setChain(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Critical Issues Escalation"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={chain.description}
                onChange={(e) => setChain(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when this escalation chain applies"
                rows={2}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Apply to Project</Label>
              <Select 
                value={chain.incident_project_id || ""} 
                onValueChange={(value) => setChain(prev => ({ ...prev, incident_project_id: value || undefined }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Apply to Priority</Label>
              <Select 
                value={chain.priority_id || ""} 
                onValueChange={(value) => setChain(prev => ({ ...prev, priority_id: value || undefined }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  {priorities?.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: priority.color }}
                        />
                        {priority.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Apply to Category</Label>
              <Select 
                value={chain.category_id || ""} 
                onValueChange={(value) => setChain(prev => ({ ...prev, category_id: value || undefined }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={chain.is_active}
                onCheckedChange={(checked) => setChain(prev => ({ ...prev, is_active: checked }))}
                disabled={!isEditing}
              />
              <Label>Active</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={chain.notify_on_escalation}
                onCheckedChange={(checked) => setChain(prev => ({ ...prev, notify_on_escalation: checked }))}
                disabled={!isEditing}
              />
              <Label>Send notifications</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Escalation Levels</CardTitle>
            <Button onClick={addLevel} size="sm" disabled={!isEditing}>
              <Plus className="h-4 w-4 mr-2" />
              Add Level
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chain.levels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No escalation levels defined</p>
              <p className="text-sm">Add levels to create an escalation chain</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chain.levels.map((level, index) => (
                <Card key={level.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Level {index + 1}</Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveLevel(level.id, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveLevel(level.id, 'down')}
                            disabled={index === chain.levels.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLevel(level.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Level Name</Label>
                        <Input
                          value={level.name}
                          onChange={(e) => updateLevel(level.id, { name: e.target.value })}
                          placeholder="e.g., Team Lead"
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Trigger After (minutes)</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={level.triggerAfterMinutes}
                            onChange={(e) => updateLevel(level.id, { triggerAfterMinutes: parseInt(e.target.value, 10) || 0 })}
                            min={1}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Escalate To User</Label>
                        <Select 
                          value={level.escalateToUserId || ""} 
                          onValueChange={(value) => updateLevel(level.id, { escalateToUserId: value || undefined })}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No specific user</SelectItem>
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Escalate To Role</Label>
                        <Select 
                          value={level.escalateToRole || ""} 
                          onValueChange={(value) => updateLevel(level.id, { escalateToRole: value || undefined })}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No specific role</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label>Escalation Message</Label>
                      <Textarea
                        value={level.escalationMessage || ""}
                        onChange={(e) => updateLevel(level.id, { escalationMessage: e.target.value })}
                        placeholder="Custom message for this escalation level"
                        rows={2}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={level.autoReassign}
                          onCheckedChange={(checked) => updateLevel(level.id, { autoReassign: checked })}
                          disabled={!isEditing}
                        />
                        <Label className="text-sm">Auto-reassign incident</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={level.notifyEscalationTarget}
                          onCheckedChange={(checked) => updateLevel(level.id, { notifyEscalationTarget: checked })}
                          disabled={!isEditing}
                        />
                        <Label className="text-sm">Notify escalation target</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={level.notifyOriginalAssignee}
                          onCheckedChange={(checked) => updateLevel(level.id, { notifyOriginalAssignee: checked })}
                          disabled={!isEditing}
                        />
                        <Label className="text-sm">Notify original assignee</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isEditing && (
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (chain.id) {
                setIsEditing(false);
              } else {
                handleNewChain();
              }
            }}
          >
            Cancel
          </Button>
          {chain.id && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={createChain.isPending || updateChain.isPending || deleteChain.isPending}
            >
              Delete
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={createChain.isPending || updateChain.isPending || deleteChain.isPending || !chain.name}
          >
            <Save className="h-4 w-4 mr-2" />
            {chain.id ? 'Update' : 'Save'} Escalation Chain
          </Button>
        </div>
      )}
    </div>
  );
}