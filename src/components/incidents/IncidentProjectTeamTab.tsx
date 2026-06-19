import { useState } from "react";
import { useProjectTeamRealtime } from "@/hooks/useIncidentProjectAssignments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useIncidentProjectTeam,
  useAvailableUsersForProject,
  useAssignUserToProject,
  useRemoveUserFromProject,
  useUpdateUserRole,
} from "@/hooks/useIncidentProjectAssignments";
import { useIncidentProjectRole } from "@/hooks/useIncidentProjectRole";
import { Plus, UserMinus, Users, Shield, User, Building2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { IncidentProjectTeamMember, IncidentProjectAssignmentRole } from "@/types/incident-project-assignment-types";

interface IncidentProjectTeamTabProps {
  projectId: string;
  projectLeadId?: string;
}

export function IncidentProjectTeamTab({ projectId, projectLeadId }: IncidentProjectTeamTabProps) {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<IncidentProjectAssignmentRole>('member');
  const [memberSearch, setMemberSearch] = useState("");

  const { data: team, isLoading: teamLoading } = useIncidentProjectTeam(projectId);
  const { data: availableUsers, isLoading: usersLoading } = useAvailableUsersForProject(projectId);
  const { isAdmin } = useIncidentProjectRole(projectId);

  useProjectTeamRealtime(projectId);

  const assignUser = useAssignUserToProject();
  const removeUser = useRemoveUserFromProject();
  const updateRole = useUpdateUserRole();

  const handleAddMember = () => {
    if (!selectedUserId) return;
    assignUser.mutate(
      { projectId, userId: selectedUserId, role: selectedRole },
      {
        onSuccess: () => {
          setAddMemberOpen(false);
          setSelectedUserId("");
          setSelectedRole('member');
          setMemberSearch("");
        },
      }
    );
  };

  const handleRemoveMember = (member: IncidentProjectTeamMember) => {
    if (!member.assignment_id) return;
    removeUser.mutate({ assignmentId: member.assignment_id, projectId });
  };

  const handleRoleChange = (member: IncidentProjectTeamMember, newRole: IncidentProjectAssignmentRole) => {
    if (!member.assignment_id) return;
    updateRole.mutate({ assignmentId: member.assignment_id, role: newRole, projectId });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email.slice(0, 2).toUpperCase();
    return '??';
  };

  // Available users filtered: exclude project lead + apply search
  const filteredAvailableUsers = (availableUsers || [])
    .filter(u => u.id !== projectLeadId)
    .filter(u => {
      if (!memberSearch) return true;
      const q = memberSearch.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });

  const staffMembers = (team || []).filter(m => m.role !== 'customer');
  const customerMembers = (team || []).filter(m => m.role === 'customer');

  if (teamLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staff Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Internal staff assigned to this project
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Dialog open={addMemberOpen} onOpenChange={(open) => { setAddMemberOpen(open); if (!open) { setMemberSearch(""); setSelectedUserId(""); setSelectedRole('member'); } }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Search and select a user to add to this project team
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search Member</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={memberSearch}
                          onChange={(e) => { setMemberSearch(e.target.value); setSelectedUserId(""); }}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select User</label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {usersLoading ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : filteredAvailableUsers.length === 0 ? (
                            <SelectItem value="none" disabled>
                              {memberSearch ? `No users matching "${memberSearch}"` : "No available users"}
                            </SelectItem>
                          ) : (
                            filteredAvailableUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email || 'Unknown User'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as IncidentProjectAssignmentRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddMember}
                        disabled={!selectedUserId || assignUser.isPending}
                      >
                        {assignUser.isPending ? "Adding..." : "Add Member"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {staffMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members assigned yet</p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add Member" to assign staff to this project
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {staffMembers.map((member) => {
                const isLead = member.user_id === projectLeadId;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(member.full_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.full_name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLead ? (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                          <Shield className="h-3 w-3 mr-1" />
                          Project Lead
                        </Badge>
                      ) : isAdmin && member.assignment_id ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member, v as IncidentProjectAssignmentRole)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" />Member</span>
                            </SelectItem>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Admin</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                          {member.role === 'admin'
                            ? <><Shield className="h-3 w-3 mr-1" />Admin</>
                            : <><User className="h-3 w-3 mr-1" />Member</>}
                        </Badge>
                      )}

                      {isAdmin && member.assignment_id && !isLead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeUser.isPending}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Contacts */}
      {customerMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Customer Contacts
            </CardTitle>
            <CardDescription>
              Customer users who can create and view incidents for this project
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {customerMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                        {getInitials(member.full_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.full_name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <Badge variant="secondary">
                    <Building2 className="h-3 w-3 mr-1" />
                    Customer
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
