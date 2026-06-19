import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, CalendarClock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import MeetingCalendar from "@/components/crm/meetings/MeetingCalendar";
import UpcomingMeetingsSidebar from "@/components/crm/meetings/UpcomingMeetingsSidebar";
import MeetingTypeFilter from "@/components/crm/meetings/MeetingTypeFilter";
import MeetingDetailPanel from "@/components/crm/meetings/MeetingDetailPanel";
import MeetingForm from "@/components/crm/meetings/MeetingForm";
import type { MeetingType, CRMMeeting } from "@/lib/crm/types";

const MeetingsPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<MeetingType | "all">("all");
  const [selectedMeeting, setSelectedMeeting] = useState<CRMMeeting | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CRMMeeting | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false);

  const handleMeetingClick = (meeting: CRMMeeting) => {
    setSelectedMeeting(meeting);
    setIsDetailOpen(true);
  };

  const handleNewMeeting = () => {
    setEditingMeeting(null);
    setSelectedDate(null);
    setIsFormOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setEditingMeeting(null);
    setSelectedDate(date);
    setIsFormOpen(true);
  };

  const handleEditMeeting = (meeting: CRMMeeting) => {
    setEditingMeeting(meeting);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedMeeting(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Meetings</h1>
            <p className="text-sm text-muted-foreground">Schedule and manage your meetings</p>
          </div>
          {/* Desktop-only: New Meeting top-right */}
          <Button onClick={handleNewMeeting} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            New Meeting
          </Button>
        </div>
        {/* Mobile-only: buttons row below title */}
        <div className="flex items-center gap-2 mt-3 md:hidden">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsUpcomingOpen(true)}>
            <CalendarClock className="h-4 w-4 mr-1" />
            Upcoming
          </Button>
          <Button size="sm" className="flex-1" onClick={handleNewMeeting}>
            <Plus className="h-4 w-4 mr-1" />
            New Meeting
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-3 border-b overflow-hidden">
        <MeetingTypeFilter value={typeFilter} onChange={setTypeFilter} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar - 70% */}
        <div className="flex-1 overflow-auto p-4">
          <MeetingCalendar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            typeFilter={typeFilter}
            onMeetingClick={handleMeetingClick}
            onDayClick={handleDayClick}
          />
        </div>

        {/* Upcoming meetings sidebar - desktop only */}
        <div className="hidden md:block w-80 border-l overflow-auto">
          <UpcomingMeetingsSidebar onMeetingClick={handleMeetingClick} />
        </div>
      </div>

      {/* Mobile: Upcoming meetings sheet */}
      <Sheet open={isUpcomingOpen} onOpenChange={setIsUpcomingOpen}>
        <SheetContent side="bottom" className="h-[70vh] overflow-y-auto rounded-t-xl">
          <SheetHeader className="mb-2">
            <SheetTitle>Upcoming Meetings</SheetTitle>
          </SheetHeader>
          <UpcomingMeetingsSidebar
            onMeetingClick={(meeting) => {
              setIsUpcomingOpen(false);
              handleMeetingClick(meeting);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Meeting detail panel */}
      <MeetingDetailPanel
        meeting={selectedMeeting}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onEdit={handleEditMeeting}
      />

      {/* Meeting form dialog */}
      <MeetingForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDate(null);
        }}
        meeting={editingMeeting}
        initialDate={selectedDate}
      />
    </div>
  );
};

export default MeetingsPage;
