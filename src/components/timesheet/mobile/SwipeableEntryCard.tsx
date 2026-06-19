import React from 'react';
import { Pencil, Trash2, Building2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SwipeableCard } from '@/components/common/SwipeableCard';
import { TimesheetEntry } from '@/lib/timesheet-service';

interface SwipeableEntryCardProps {
  entry: TimesheetEntry;
  onEdit: (entry: TimesheetEntry) => void;
  onDelete: (entry: TimesheetEntry) => void;
  onClick?: (entry: TimesheetEntry) => void;
  className?: string;
}

export const SwipeableEntryCard: React.FC<SwipeableEntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
  onClick,
  className,
}) => {
  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <SwipeableCard
      className={className}
      leftAction={{
        type: 'edit',
        label: 'Edit',
        icon: <Pencil className="h-5 w-5" />,
        color: 'bg-blue-500',
        onAction: () => onEdit(entry),
      }}
      rightAction={{
        type: 'delete',
        label: 'Delete',
        icon: <Trash2 className="h-5 w-5" />,
        color: 'bg-destructive',
        onAction: () => onDelete(entry),
      }}
      onClick={onClick ? () => onClick(entry) : undefined}
    >
      <Card className="bg-background shadow-sm border-0">
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h4 className="font-medium truncate">
                  {entry.project?.name || entry.contract?.name || 'No Project'}
                </h4>
              </div>
              {entry.entry_type === 'contract' && entry.contract?.name && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {entry.contract.name}
                </p>
              )}
              {entry.notes && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {entry.notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <Badge variant="secondary" className="font-bold text-base">
                  {entry.hours_logged}h
                </Badge>
                {entry.start_time && entry.end_time && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(entry);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </SwipeableCard>
  );
};

export default SwipeableEntryCard;
