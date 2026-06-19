import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX, Filter } from "lucide-react";

interface LeaveTrendsTableProps {
  data: any[];
  isLoading: boolean;
}

const LeaveTrendsTable = ({ data, isLoading }: LeaveTrendsTableProps) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Days Requested</TableHead>
              <TableHead>Days Approved</TableHead>
              <TableHead>Approval Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(6).fill(0).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <FileX className="h-12 w-12 text-gray-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No trends data found</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm">
            No leave trend data found for the selected date range.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
          <Filter className="h-3 w-3" />
          <span>Tip: Use "Generate Report" button to fetch data with your current filters</span>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totals = React.useMemo(() => {
    return data.reduce(
      (acc, item) => ({
        applications: acc.applications + item.applications,
        daysRequested: acc.daysRequested + item.daysRequested,
        daysApproved: acc.daysApproved + item.daysApproved,
      }),
      { applications: 0, daysRequested: 0, daysApproved: 0 }
    );
  }, [data]);

  const overallApprovalRate = totals.daysRequested > 0 
    ? (totals.daysApproved / totals.daysRequested) * 100 
    : 0;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Applications</TableHead>
            <TableHead>Days Requested</TableHead>
            <TableHead>Days Approved</TableHead>
            <TableHead>Approval Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item: any, index: number) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.period}</TableCell>
              <TableCell>{item.applications}</TableCell>
              <TableCell>{item.daysRequested}</TableCell>
              <TableCell>{item.daysApproved}</TableCell>
              <TableCell>{item.approvalRate?.toFixed(2)}%</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-medium bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell>{totals.applications}</TableCell>
            <TableCell>{totals.daysRequested}</TableCell>
            <TableCell>{totals.daysApproved}</TableCell>
            <TableCell>{overallApprovalRate.toFixed(2)}%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaveTrendsTable;