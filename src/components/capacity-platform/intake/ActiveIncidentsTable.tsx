import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { Incident, IncidentStatus } from "@/types/incident-types";

const STATUS_CLASS: Record<IncidentStatus, string> = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Triaged: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Resolved: "bg-green-50 text-green-700 border-green-200",
  Closed: "bg-gray-100 text-gray-500 border-gray-200",
};

interface Props {
  incidents: Incident[];
}

const ActiveIncidentsTable = ({ incidents }: Props) => {
  const navigate = useNavigate();

  if (incidents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-6 text-center border rounded-md">
        No active incidents.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono">Number</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((inc) => (
            <TableRow
              key={inc.id}
              className="cursor-pointer hover:bg-muted/40"
              onClick={() =>
                navigate(`/incident-management/incidents/${inc.id}`)
              }
            >
              <TableCell className="font-mono text-xs">
                {inc.incident_number}
              </TableCell>
              <TableCell className="font-medium">{inc.title}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={STATUS_CLASS[inc.status]}
                >
                  {inc.status}
                </Badge>
              </TableCell>
              <TableCell>
                {inc.priority ? (
                  <span className="flex items-center gap-1.5 text-sm">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: inc.priority.color }}
                    />
                    {inc.priority.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {inc.incident_project?.name ?? (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {new Date(inc.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ActiveIncidentsTable;
