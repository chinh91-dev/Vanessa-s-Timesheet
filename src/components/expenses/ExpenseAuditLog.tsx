import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, User, FileText, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  action: string;
  user_name: string;
  timestamp: string;
  details?: {
    old_status?: string;
    new_status?: string;
    amount?: number;
    reason?: string;
    notes?: string;
  };
}

interface ExpenseAuditLogProps {
  expenseId: string;
  auditLog: AuditLogEntry[];
}

const ExpenseAuditLog: React.FC<ExpenseAuditLogProps> = ({ expenseId, auditLog }) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'expense_created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'expense_updated':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'expense_submitted':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'expense_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expense_rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expense_deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'expense_created':
        return 'Created';
      case 'expense_updated':
        return 'Updated';
      case 'expense_submitted':
        return 'Submitted for Approval';
      case 'expense_approved':
        return 'Approved';
      case 'expense_rejected':
        return 'Rejected';
      case 'expense_deleted':
        return 'Deleted';
      default:
        return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'submitted':
        return 'default';
      case 'draft':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!auditLog || auditLog.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity History</CardTitle>
          <CardDescription>Track all changes and approvals for this expense</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No activity recorded for this expense yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity History</CardTitle>
        <CardDescription>Track all changes and approvals for this expense</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditLog.map((entry, index) => (
            <div key={entry.id}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(entry.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {getActionLabel(entry.action)}
                    </span>
                    {entry.details?.old_status && entry.details?.new_status && (
                      <div className="flex items-center gap-1">
                        <Badge variant={getStatusBadgeVariant(entry.details.old_status)} className="text-xs">
                          {entry.details.old_status}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant={getStatusBadgeVariant(entry.details.new_status)} className="text-xs">
                          {entry.details.new_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="h-3 w-3" />
                    <span>{entry.user_name}</span>
                    <Clock className="h-3 w-3 ml-2" />
                    <span>{format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>

                  {entry.details && (
                    <div className="text-sm space-y-1">
                      {entry.details.amount && (
                        <p className="text-muted-foreground">
                          Amount: <span className="font-medium">${entry.details.amount.toFixed(2)}</span>
                        </p>
                      )}
                      {entry.details.reason && (
                        <p className="text-muted-foreground">
                          Reason: <span className="font-medium">{entry.details.reason}</span>
                        </p>
                      )}
                      {entry.details.notes && (
                        <p className="text-muted-foreground">
                          Notes: <span className="font-medium">{entry.details.notes}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {index < auditLog.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseAuditLog;