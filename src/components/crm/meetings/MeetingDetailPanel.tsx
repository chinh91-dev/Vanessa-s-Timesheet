import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  UserX,
  RefreshCw,
  Target,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { MEETING_TYPES, MEETING_STATUSES } from "@/lib/crm/constants";
import { useUpdateMeeting, useDeleteMeeting } from "@/hooks/crm/useMeetings";
import { useAuth } from "@/context/AuthContext";
import { canDeleteEntity } from "@/lib/crm/permissions";
import MeetingNotesSection from "./MeetingNotesSection";
import MeetingTasksSection from "./MeetingTasksSection";
import RescheduleDialog from "./RescheduleDialog";
import type { CRMMeeting, MeetingType } from "@/lib/crm/types";

// Safe accessor for meeting type info with fallback
const getMeetingTypeInfo = (type: string | null | undefined) => {
  const defaultInfo = { label: "Meeting", color: "hsl(var(--muted))" };
  if (!type || !(type in MEETING_TYPES)) return defaultInfo;
  return MEETING_TYPES[type as MeetingType];
};

interface MeetingDetailPanelProps {
  meeting: CRMMeeting | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (meeting: CRMMeeting) => void;
}

const MeetingDetailPanel: React.FC<MeetingDetailPanelProps> = ({
  meeting,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { userRole } = useAuth();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  if (!meeting) return null;

  const handleMarkComplete = () => {
    updateMeeting.mutate(
      { id: meeting.id, data: { status: "completed" } },
      { onSuccess: () => onClose() }
    );
  };

  const handleCancel = () => {
    updateMeeting.mutate(
      { id: meeting.id, data: { status: "cancelled" } },
      { onSuccess: () => onClose() }
    );
  };

  const handleNoShow = () => {
    updateMeeting.mutate(
      { id: meeting.id, data: { status: "no_show" } },
      { onSuccess: () => onClose() }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      deleteMeeting.mutate(meeting.id, {
        onSuccess: () => onClose(),
      });
    }
  };

  const getContactInfo = () => {
    const name = meeting.contact_name || meeting.lead?.contact_name || meeting.account?.name;
    const phone = meeting.contact_phone || meeting.lead?.phone || meeting.account?.phone;
    const email = meeting.contact_email || meeting.lead?.email || meeting.account?.email;
    return { name, phone, email };
  };

  const contact = getContactInfo();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{meeting.title}</SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  style={{ backgroundColor: getMeetingTypeInfo(meeting.meeting_type).color }}
                  className="text-white"
                >
                  {getMeetingTypeInfo(meeting.meeting_type).label}
                </Badge>
                <Badge
                  variant="outline"
                  style={{ borderColor: MEETING_STATUSES[meeting.status].color, color: MEETING_STATUSES[meeting.status].color }}
                >
                  {MEETING_STATUSES[meeting.status].label}
                </Badge>
              </div>
          </div>
            {!["completed", "cancelled", "no_show"].includes(meeting.status) && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(meeting)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Schedule Section */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Schedule
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(parseISO(meeting.meeting_date), "EEEE, d MMMM yyyy")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {meeting.start_time.slice(0, 5)}
                  {meeting.end_time && ` - ${meeting.end_time.slice(0, 5)}`}
                </span>
              </div>
              {meeting.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{meeting.location}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Contact Information
            </h4>
            <div className="space-y-2">
              {contact.name && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.name}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {meeting.prospect && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Prospect
                </h4>
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{meeting.prospect.name}</span>
                </div>
              </div>
            </>
          )}

          {meeting.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Description
                </h4>
                <p className="text-sm whitespace-pre-wrap">{meeting.description}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Quick Actions */}
          {meeting.status === "scheduled" && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Quick Actions
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleMarkComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Meeting
                </Button>
                <Button variant="outline" size="sm" onClick={handleNoShow}>
                  <UserX className="h-4 w-4 mr-2" />
                  No Show
                </Button>
              </div>
            </div>
          )}

          {/* Reschedule Button for Cancelled/No-Show */}
          {["cancelled", "no_show"].includes(meeting.status) && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Reschedule
                </h4>
                <Button onClick={() => setIsRescheduleOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reschedule Meeting
                </Button>
              </div>
              <Separator />
            </>
          )}

          {canDeleteEntity(userRole) && (
            <div>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Meeting
              </Button>
            </div>
          )}

          {/* Meeting Tasks */}
          <MeetingTasksSection meetingId={meeting.id} />

          <Separator />

          {/* Meeting Notes */}
          <MeetingNotesSection meetingId={meeting.id} />
        </div>

        {/* Reschedule Dialog */}
        <RescheduleDialog
          meeting={meeting}
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          onSuccess={onClose}
        />
      </SheetContent>
    </Sheet>
  );
};

export default MeetingDetailPanel;
