
import React, { useState } from "react";
import { TimesheetEntry } from "@/lib/timesheet-service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, FileText, User, Tag, Trash2, Pencil } from "lucide-react";
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { getEntryColor, getEntryDisplayName } from "./EntryCard"; // Adjust import path if needed
// Haptics helper or mock
const haptics = {
  light: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); },
  medium: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40); },
};

interface MobileEntryCardProps {
  entry: TimesheetEntry;
  onEditEntry: (entry: TimesheetEntry) => void;
  onDeleteEntry: (entry: TimesheetEntry) => void;
  onEntryChange: () => void;
}

const MobileEntryCard: React.FC<MobileEntryCardProps> = ({
  entry,
  onEditEntry,
  onDeleteEntry,
  onEntryChange
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [{ x }, api] = useSpring(() => ({ x: 0 }));

  // Lines 20-49: useDrag gesture handler
  const bind = useDrag(
    ({ active, movement: [mx], cancel }) => {
      // Swipe logic from user request
      if (active && Math.abs(mx) > 10) {
        // Swipe LEFT to DELETE (negative x > 150px)
        if (mx < -150) {
          cancel();
          setIsDeleting(true);
          haptics.medium();          // ← Medium haptic for delete
          api.start({ x: -300 });    // ← Slide off screen
          // Use timeout to allow animation to finish before delete callback
          // In real app maybe show confirmation or undo toast.
          // For this request logic:
          setTimeout(() => onDeleteEntry(entry), 200);
          return;
        }
        // Swipe RIGHT to EDIT (positive x > 150px)
        if (mx > 150) {
          cancel();
          haptics.light();           // ← Light haptic for edit
          onEditEntry(entry);
          api.start({ x: 0 });       // ← Return to position
          return;
        }
        // Follow finger during swipe
        api.start({ x: mx, immediate: true });
      } else {
        // Snap back when released without action
        api.start({ x: 0 });
      }
    },
    { axis: 'x', filterTaps: true }  // ← Restrict to horizontal only
  );

  const formatUserName = (entry: TimesheetEntry) => {
    // Simplified user name logic (keeping existing if needed or generic)
    // reusing existing logic from previous file view if available or simple one
    return entry.user?.full_name || entry.user_full_name || "Unknown";
  };

  return (
    <div className="relative mb-2 select-none touch-pan-y">
      {/* Background Actions Layer */}
      <div className="absolute inset-0 flex rounded-xl overflow-hidden">
        {/* Edit Background (Left side - revealed when swiping Right) */}
        <div className="flex-1 bg-blue-500 flex items-center justify-start pl-6">
          <Pencil className="text-white w-6 h-6" />
        </div>
        {/* Delete Background (Right side - revealed when swiping Left) */}
        <div className="flex-1 bg-red-500 flex items-center justify-end pr-6">
          <Trash2 className="text-white w-6 h-6" />
        </div>
      </div>

      {/* Foreground Card Layer */}
      <animated.div
        {...bind()}
        style={{ x, touchAction: 'pan-y' }}
        className="relative bg-card rounded-xl shadow-sm z-10"
      >
        <Card
          className={cn(
            "overflow-hidden border-0 shadow-none", // Remove default card shadow/border as we handle it on animated div or similar
            getEntryColor(entry)
          )}
        >
          <CardContent className="p-3">
            {/* Header with Project Name and Hours */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight break-words">
                  {getEntryDisplayName(entry)}
                </h3>
                {entry.entry_type === 'contract' && (
                  <div className="flex items-center mt-0.5">
                    <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Contract</span>
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="font-bold text-base rounded-lg bg-background/70 px-2 py-0.5 flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {entry.hours_logged}h
                </div>
              </div>
            </div>

            {/* User and Task Info */}
            <div className="space-y-1.5 mb-2">
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                <span>{formatUserName(entry)}</span>
              </div>
              {entry.jira_task_id && (
                <div className="inline-block bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                  {entry.jira_task_id}
                </div>
              )}
            </div>
            {/* Notes */}
            {entry.notes && (
              <div className="mb-0">
                <div className="flex items-start bg-background/40 p-2 rounded-lg">
                  <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground mr-1.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground break-words leading-relaxed line-clamp-2">
                    {entry.notes}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </animated.div>
    </div>
  );
};

export default MobileEntryCard;

