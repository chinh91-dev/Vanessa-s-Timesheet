
import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { User } from "@/lib/user-service";
import { AuditLogEntry } from "@/lib/audit/audit-service";

interface AuditLogsTableProps {
  auditData: AuditLogEntry[];
  users: User[];
  isLoading: boolean;
}

type ColumnKey = "date" | "user" | "action" | "entity" | "description";

const AuditLogsTable = ({ auditData, users, isLoading }: AuditLogsTableProps) => {
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState<Record<ColumnKey, string>>({
    date: "",
    user: "",
    action: "",
    entity: "",
    description: "",
  });

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('created')) return 'default';
    if (action.includes('updated')) return 'secondary';
    if (action.includes('deleted') || action.includes('unassigned')) return 'destructive';
    if (action.includes('assigned')) return 'outline';
    if (action.includes('report_generated') || action.includes('audit_report_generated')) return 'default';
    return 'default';
  };

  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      'entry_created': 'Entry Created',
      'entry_updated': 'Entry Updated',
      'entry_deleted': 'Entry Deleted',
      'project_created': 'Project Created',
      'project_updated': 'Project Updated',
      'project_deleted': 'Project Deleted',
      'contract_created': 'Contract Created',
      'contract_updated': 'Contract Updated',
      'contract_deleted': 'Contract Deleted',
      'user_assigned': 'User Assigned',
      'user_unassigned': 'User Unassigned',
      'member_created': 'Member Added',
      'member_updated': 'Member Updated',
      'member_deleted': 'Member Deleted',
      'report_generated': 'Report Generated',
      'audit_report_generated': 'Audit Report Generated'
    };

    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getUserDisplayName = (userId: string, userName: string): string => {
    if (userName && userName !== 'Unknown User') return userName;
    const user = users.find(u => u.id === userId);
    return user ? (user.full_name || user.email || 'Unknown User') : 'Unknown User';
  };

  const filteredData = useMemo(() => {
    const g = globalSearch.trim().toLowerCase();
    const c = {
      date: columnSearch.date.trim().toLowerCase(),
      user: columnSearch.user.trim().toLowerCase(),
      action: columnSearch.action.trim().toLowerCase(),
      entity: columnSearch.entity.trim().toLowerCase(),
      description: columnSearch.description.trim().toLowerCase(),
    };

    return auditData.filter((entry) => {
      const dateStr = format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm').toLowerCase();
      const userStr = getUserDisplayName(entry.user_id, entry.user_name).toLowerCase();
      const actionStr = formatAction(entry.action).toLowerCase();
      const rawAction = (entry.action || '').toLowerCase();
      const entityStr = (entry.entity_name || 'Unknown').toLowerCase();
      const descStr = (entry.description || '').toLowerCase();
      const detailsStr = entry.details ? JSON.stringify(entry.details).toLowerCase() : '';

      if (c.date && !dateStr.includes(c.date)) return false;
      if (c.user && !userStr.includes(c.user)) return false;
      if (c.action && !actionStr.includes(c.action) && !rawAction.includes(c.action)) return false;
      if (c.entity && !entityStr.includes(c.entity)) return false;
      if (c.description && !descStr.includes(c.description) && !detailsStr.includes(c.description)) return false;

      if (g) {
        const haystack = `${dateStr} ${userStr} ${actionStr} ${rawAction} ${entityStr} ${descStr} ${detailsStr}`;
        if (!haystack.includes(g)) return false;
      }
      return true;
    });
  }, [auditData, users, globalSearch, columnSearch]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Loading comprehensive audit trail...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (auditData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>No audit logs found for the selected criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No audit entries match your current filters.</p>
            <p className="text-sm mt-1">Try adjusting the date range or removing filters.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const setCol = (key: ColumnKey, value: string) =>
    setColumnSearch((prev) => ({ ...prev, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>
          Complete audit trail showing all user actions including creates, updates, deletions, assignments, team member management, and report generation ({filteredData.length} of {auditData.length} entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search across all columns..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">
                  <div className="font-medium mb-1">Date &amp; Time</div>
                  <Input
                    placeholder="Filter..."
                    value={columnSearch.date}
                    onChange={(e) => setCol("date", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableHead>
                <TableHead className="min-w-[160px]">
                  <div className="font-medium mb-1">User</div>
                  <Input
                    placeholder="Filter..."
                    value={columnSearch.user}
                    onChange={(e) => setCol("user", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableHead>
                <TableHead className="min-w-[160px]">
                  <div className="font-medium mb-1">Action</div>
                  <Input
                    placeholder="Filter..."
                    value={columnSearch.action}
                    onChange={(e) => setCol("action", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableHead>
                <TableHead className="min-w-[160px]">
                  <div className="font-medium mb-1">Entity</div>
                  <Input
                    placeholder="Filter..."
                    value={columnSearch.entity}
                    onChange={(e) => setCol("entity", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableHead>
                <TableHead className="min-w-[240px]">
                  <div className="font-medium mb-1">Description</div>
                  <Input
                    placeholder="Filter..."
                    value={columnSearch.description}
                    onChange={(e) => setCol("description", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No entries match the current search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {getUserDisplayName(entry.user_id, entry.user_name)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(entry.action)}>
                        {formatAction(entry.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {entry.entity_name || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={entry.description}>
                        {entry.description}
                      </div>
                      {entry.details && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View details
                          </summary>
                          <pre className="text-xs bg-muted text-foreground p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AuditLogsTable;
