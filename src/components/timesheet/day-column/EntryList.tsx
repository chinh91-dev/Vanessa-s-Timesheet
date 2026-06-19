
import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { TimesheetEntry } from "@/lib/timesheet-service";
import { cn } from "@/lib/utils";
import EntryCard from "../entry-card/EntryCard";

interface EntryListProps {
  droppableId: string;
  entries: TimesheetEntry[];
  onEditEntry: (entry: TimesheetEntry) => void;
  onDeleteEntry: (entry: TimesheetEntry) => void;
  onEntryChange: () => void;
}

const EntryList: React.FC<EntryListProps> = ({
  droppableId,
  entries,
  onEditEntry,
  onDeleteEntry,
  onEntryChange,
}) => {
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef} 
          {...provided.droppableProps}
          className={cn(
            "flex flex-col space-y-2 min-h-[50px] p-1 transition-colors rounded-md",
            snapshot.isDraggingOver ? "bg-primary/5" : ""
          )}
        >
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              No entries for this day
            </div>
          ) : (
            entries.map((entry, index) => {
              const stableId = entry.id || `temp-${index}`;
              return (
                <Draggable
                  key={stableId}
                  draggableId={stableId}
                  index={index}
                  isDragDisabled={!entry.id}
                >
                  {(provided, snapshot) => (
                    <EntryCard
                      entry={entry}
                      provided={provided}
                      snapshot={snapshot}
                      onEditEntry={onEditEntry}
                      onDeleteEntry={onDeleteEntry}
                      onEntryChange={onEntryChange}
                    />
                  )}
                </Draggable>
              );
            })
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default EntryList;
