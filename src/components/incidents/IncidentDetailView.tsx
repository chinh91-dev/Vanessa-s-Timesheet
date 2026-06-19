import React, { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Users, MessageSquare, Clock, Calendar, User, Trash2, HardDrive, ExternalLink, UserPlus, X } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { EnhancedSLAIndicator } from "./EnhancedSLAIndicator";
import { StatusTransitionDialog } from "./StatusTransitionDialog";
import { AssignmentDialog } from "./AssignmentDialog";
import { ActivitySection } from "./ActivitySection";
import { IncidentRelationshipsCard } from "./IncidentRelationshipsCard";
import { EditIncidentDialog } from "./EditIncidentDialog";
import DeleteIncidentDialog from "./DeleteIncidentDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIncident, useIncidentComments, useUpdateIncident, useAddComment, useIncidentAssets, useIsUserInProject, useIncidentParticipants, useAddParticipant, useRemoveParticipant, useProjectMembers, useAssignableUsers } from "@/hooks/useIncidents";
import { useIncidentRealtime } from "@/hooks/useIncidentRealtime";
import { useIncidentCommentRealtime } from "@/hooks/useIncidentCommentRealtime";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import type { IncidentStatus, CommentAttachment } from "@/types/incident-types";

export function IncidentDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [participantUserId, setParticipantUserId] = useState("");

  const { data: incident, isLoading, error } = useIncident(id!);
  const { data: comments = [] } = useIncidentComments(id!);
  const { data: incidentAssets = [] } = useIncidentAssets(id!);
  const { data: isInProject } = useIsUserInProject(incident?.incident_project_id);
  const { data: participants = [] } = useIncidentParticipants(id!);
  const { data: projectMembers = [] } = useProjectMembers(incident?.incident_project_id);
  const { data: allUsers = [] } = useAssignableUsers();
  const participantCandidates = (projectMembers.length > 0 ? projectMembers : allUsers)
    .filter(m => !participants.some(p => p.user_id === m.id));

  const updateIncident = useUpdateIncident();
  const addComment = useAddComment();
  const addParticipant = useAddParticipant();
  const removeParticipant = useRemoveParticipant();

  // Enable real-time updates for incidents, comments, and assets
  useIncidentRealtime();
  useIncidentCommentRealtime(id);
  useRealtimeSubscription({
    table: 'incident_assets',
    filter: `incident_id=eq.${id}`,
    queryKeys: [['incident-assets', id!]],
    channelName: `incident-assets-${id}`,
    enabled: !!id,
  });

  // Access control: managers/admins see any incident; project members and
  // incident owners also have access. Wait until loaded before redirecting.
  const isManagerOrAbove = ['admin', 'manager', 'sale_manager'].includes(userRole ?? '');
  const isOwner =
    incident?.assigned_to === user?.id || incident?.created_by === user?.id;

  if (!isLoading && incident && !isManagerOrAbove && !isOwner && !isInProject) {
    return <Navigate to="/incident-management" replace />;
  }

  const handleStatusChange = async (newStatus: IncidentStatus, comment?: string) => {
    if (!incident) return;
    
    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        updates: { status: newStatus }
      });
      
      if (comment) {
        await addComment.mutateAsync({
          incident_id: incident.id,
          content: `Status changed to ${newStatus}: ${comment}`,
          is_internal: false
        });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      throw error;
    }
  };

  const handleAssignment = async (userId: string | null, reason?: string) => {
    if (!incident) return;
    
    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        updates: { assigned_to: userId }
      });
      // Assignment changes are logged in incident_history via updateIncident
      // No comment needed - appears in History tab only
    } catch (error) {
      console.error("Failed to update assignment:", error);
      throw error;
    }
  };

  const handleAddComment = async (content: string, isInternal: boolean, attachments?: CommentAttachment[]) => {
    if (!incident) return;
    
    await addComment.mutateAsync({
      incident_id: incident.id,
      content,
      is_internal: isInternal,
      attachments
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-24 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error ? `Error loading incident: ${error.message}` : "Incident not found"}
            </p>
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline" 
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => {
            if (incident?.incident_project_id) {
              navigate(`/incident-management/projects/${incident.incident_project_id}`);
            } else {
              navigate('/incident-management');
            }
          }}
          variant="ghost"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setEditDialogOpen(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            onClick={() => setAssignmentDialogOpen(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Assign
          </Button>
          <Button
            onClick={() => setStatusDialogOpen(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Change Status
          </Button>
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Incident Details */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {incident.incident_number}
                  </Badge>
                  <StatusBadge status={incident.status} />
                  <PriorityBadge priority={incident.priority} />
                </div>
                <CardTitle className="text-2xl">{incident.title}</CardTitle>
              </div>
              <EnhancedSLAIndicator incident={incident} showDetails />
            </div>

            {incident.description && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {incident.description}
              </p>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Assignee
              </div>
              {incident.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {incident.assignee.full_name?.charAt(0) || incident.assignee.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {incident.assignee.full_name || incident.assignee.email}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Created
              </div>
              <div className="text-sm">
                {format(new Date(incident.created_at), "d MMM yyyy, h:mm a")}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Reporter
              </div>
              {incident.creator ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {incident.creator.full_name?.charAt(0) || incident.creator.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {incident.creator.full_name || incident.creator.email}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unknown</span>
              )}
            </div>

            {incident.category && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Category</div>
                <Badge variant="secondary">{incident.category.name}</Badge>
              </div>
            )}

            {incident.incident_project && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Project</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {incident.incident_project.project_key}
                  </Badge>
                  <span className="text-sm">{incident.incident_project.name}</span>
                </div>
              </div>
            )}

            {(incident.escalated_at || incident.resolved_at) && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Timeline</div>
                <div className="space-y-1 text-sm">
                  {incident.escalated_at && (
                    <div className="text-warning">
                      Escalated {format(new Date(incident.escalated_at), "d MMM yyyy, h:mm a")}
                    </div>
                  )}
                  {incident.resolved_at && (
                    <div className="text-success">
                      Resolved {format(new Date(incident.resolved_at), "d MMM yyyy, h:mm a")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Participants (CC) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants
                {participants.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({participants.length})</span>
                )}
              </h3>
              <div className="flex items-center gap-1">
                <Select value={participantUserId} onValueChange={setParticipantUserId}>
                  <SelectTrigger className="h-8 w-44 text-sm">
                    <SelectValue placeholder="Add participant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {participantCandidates.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  disabled={!participantUserId || addParticipant.isPending}
                  onClick={() => {
                    addParticipant.mutate(
                      { incidentId: incident.id, userId: participantUserId },
                      { onSuccess: () => setParticipantUserId("") }
                    );
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>

            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants. Add people to CC them on comments.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {p.user?.full_name?.charAt(0) || p.user?.email?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{p.user?.full_name || p.user?.email || "Unknown"}</span>
                    <button
                      onClick={() => removeParticipant.mutate({ incidentId: incident.id, userId: p.user_id })}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                      title="Remove participant"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Incident Relationships */}
          <IncidentRelationshipsCard incidentId={incident.id} />

          {/* Linked Assets */}
          {incidentAssets.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <HardDrive className="h-4 w-4" />
                  Linked Assets ({incidentAssets.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {incidentAssets.map((ia: any) => (
                    <div
                      key={ia.asset_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{ia.asset?.name || 'Unknown Asset'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {ia.asset?.asset_tag && <span>Tag: {ia.asset.asset_tag}</span>}
                          {ia.asset?.serial_number && <span>S/N: {ia.asset.serial_number}</span>}
                          {ia.asset?.type && <span>{ia.asset.type.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ia.asset?.status && (
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: ia.asset.status.colour ? `${ia.asset.status.colour}20` : undefined }}
                          >
                            {ia.asset.status.name}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/incident-management/assets/${ia.asset_id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Activity */}
          <ActivitySection 
            incidentId={incident.id}
            comments={comments}
            onAddComment={handleAddComment}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <StatusTransitionDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        incident={incident}
        onStatusChange={handleStatusChange}
      />

      <AssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        incident={incident}
        onAssign={handleAssignment}
      />

      <EditIncidentDialog
        incident={incident}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <DeleteIncidentDialog
        incident={incident}
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}