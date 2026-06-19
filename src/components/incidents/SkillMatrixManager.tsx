import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Star, Award, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserSkill {
  id: string;
  user_id: string;
  skill_category_id: string;
  skill_name: string;
  proficiency_level: number;
  years_experience: number;
  is_primary: boolean;
  user_name: string;
  user_email: string;
  category_name: string;
  category_color: string;
}

interface SkillCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export function SkillMatrixManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [skillName, setSkillName] = useState<string>('');
  const [proficiencyLevel, setProficiencyLevel] = useState<number>(1);
  const [yearsExperience, setYearsExperience] = useState<number>(0);
  const [isPrimary, setIsPrimary] = useState<boolean>(false);

  const queryClient = useQueryClient();

  // Fetch users with caching
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch skill categories with caching
  const { data: categories } = useQuery({
    queryKey: ['skill-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as SkillCategory[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch user skills with parallel queries
  const { data: userSkills, isLoading } = useQuery({
    queryKey: ['user-skills'],
    queryFn: async () => {
      // Fetch all data in parallel
      const [skillsResult, profilesResult, categoriesResult] = await Promise.all([
        supabase.from('user_skills').select('*'),
        supabase.from('profiles').select('id, full_name, email').eq('is_active', true),
        supabase.from('skill_categories').select('id, name, color')
      ]);

      if (skillsResult.error) throw skillsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      // Create lookup maps for O(1) access
      const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
      const categoriesMap = new Map(categoriesResult.data?.map(c => [c.id, c]) || []);

      // Combine the data
      return (skillsResult.data || []).map(skill => {
        const profile = profilesMap.get(skill.user_id);
        const category = categoriesMap.get(skill.skill_category_id);
        
        return {
          id: skill.id,
          user_id: skill.user_id,
          skill_category_id: skill.skill_category_id,
          skill_name: skill.skill_name,
          proficiency_level: skill.proficiency_level,
          years_experience: skill.years_experience,
          is_primary: skill.is_primary,
          user_name: profile?.full_name || profile?.email || 'Unknown User',
          user_email: profile?.email || '',
          category_name: category?.name || 'Unknown Category',
          category_color: category?.color || '#3b82f6'
        };
      }) as UserSkill[];
    },
    staleTime: 60 * 1000, // 1 minute cache
  });

  // Add skill mutation
  const addSkillMutation = useMutation({
    mutationFn: async (newSkill: {
      user_id: string;
      skill_category_id: string;
      skill_name: string;
      proficiency_level: number;
      years_experience: number;
      is_primary: boolean;
    }) => {
      const { data, error } = await supabase
        .from('user_skills')
        .insert(newSkill)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Skill Added",
        description: "User skill has been successfully added",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add skill",
        variant: "destructive",
      });
    }
  });

  // Delete skill mutation
  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      toast({
        title: "Skill Removed",
        description: "User skill has been successfully removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove skill",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedUser('');
    setSelectedCategory('');
    setSkillName('');
    setProficiencyLevel(1);
    setYearsExperience(0);
    setIsPrimary(false);
  };

  const handleAddSkill = () => {
    if (!selectedUser || !selectedCategory || !skillName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addSkillMutation.mutate({
      user_id: selectedUser,
      skill_category_id: selectedCategory,
      skill_name: skillName.trim(),
      proficiency_level: proficiencyLevel,
      years_experience: yearsExperience,
      is_primary: isPrimary
    });
  };

  const getProficiencyLabel = (level: number) => {
    switch (level) {
      case 1: return "Beginner";
      case 2: return "Basic";
      case 3: return "Intermediate";
      case 4: return "Advanced";
      case 5: return "Expert";
      default: return "Unknown";
    }
  };

  const getProficiencyColor = (level: number) => {
    switch (level) {
      case 1: return "text-red-600";
      case 2: return "text-orange-600";
      case 3: return "text-yellow-600";
      case 4: return "text-blue-600";
      case 5: return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Group skills by user
  const skillsByUser = userSkills?.reduce((acc, skill) => {
    if (!acc[skill.user_id]) {
      acc[skill.user_id] = {
        user_name: skill.user_name,
        user_email: skill.user_email,
        skills: []
      };
    }
    acc[skill.user_id].skills.push(skill);
    return acc;
  }, {} as Record<string, { user_name: string; user_email: string; skills: UserSkill[] }>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Team Skills Matrix
              </CardTitle>
              <CardDescription>
                Manage user skills and expertise levels for smart assignment
              </CardDescription>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add User Skill</DialogTitle>
                  <DialogDescription>
                    Add a new skill to a team member's profile
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Skill Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skillName">Skill Name</Label>
                    <Input
                      id="skillName"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      placeholder="e.g., PostgreSQL, Network Troubleshooting"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proficiency">Proficiency Level</Label>
                    <Select value={proficiencyLevel.toString()} onValueChange={(value) => setProficiencyLevel(parseInt(value, 10))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Beginner</SelectItem>
                        <SelectItem value="2">2 - Basic</SelectItem>
                        <SelectItem value="3">3 - Intermediate</SelectItem>
                        <SelectItem value="4">4 - Advanced</SelectItem>
                        <SelectItem value="5">5 - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input
                      id="experience"
                      type="number"
                      min="0"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="isPrimary">Primary skill for this user</Label>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddSkill} disabled={addSkillMutation.isPending}>
                      {addSkillMutation.isPending ? "Adding..." : "Add Skill"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(skillsByUser || {}).map(([userId, userData]) => (
              <div key={userId} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarFallback>{getInitials(userData.user_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{userData.user_name}</div>
                    <div className="text-sm text-muted-foreground">{userData.user_email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {userData.skills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{skill.skill_name}</div>
                          {skill.is_primary && <Star className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">{skill.category_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getProficiencyColor(skill.proficiency_level)}`}
                          >
                            {getProficiencyLabel(skill.proficiency_level)}
                          </Badge>
                          {skill.years_experience > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {skill.years_experience}y exp
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSkillMutation.mutate(skill.id)}
                        disabled={deleteSkillMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {userData.skills.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    <User className="h-8 w-8 mx-auto mb-2" />
                    <p>No skills added yet</p>
                  </div>
                )}
              </div>
            ))}

            {(!skillsByUser || Object.keys(skillsByUser).length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                <Award className="h-8 w-8 mx-auto mb-2" />
                <p>No skills have been added yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}