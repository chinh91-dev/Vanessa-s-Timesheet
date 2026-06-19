import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX, Filter } from "lucide-react";
import { formatDateDisplay } from "@/lib/date-utils";

interface LeaveUsageTableProps {
  data: any;
  isLoading: boolean;
}

const LeaveUsageTable = ({ data, isLoading }: LeaveUsageTableProps) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(6).fill(0).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <FileX className="h-12 w-12 text-gray-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No data found</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm">
            No leave usage data found for the selected criteria. Try adjusting your filters.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
          <Filter className="h-3 w-3" />
          <span>Tip: Use "Generate Report" button to fetch data with your current filters</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Summary</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Total Applications</TableCell>
              <TableCell>{data.totalApplications}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Approved Applications</TableCell>
              <TableCell>{data.approvedApplications}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Rejected Applications</TableCell>
              <TableCell>{data.rejectedApplications}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending Applications</TableCell>
              <TableCell>{data.pendingApplications}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Days Requested</TableCell>
              <TableCell>{data.totalDaysRequested}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Days Approved</TableCell>
              <TableCell>{data.totalDaysApproved}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Most Popular Leave Type</TableCell>
              <TableCell>{data.mostPopularLeaveType || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Peak Usage Month</TableCell>
              <TableCell>{data.peakUsageMonth || 'N/A'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LeaveUsageTable;