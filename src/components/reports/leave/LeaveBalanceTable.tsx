import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX, Filter } from "lucide-react";

interface LeaveBalanceTableProps {
  data: any;
  isLoading: boolean;
}

const LeaveBalanceTable = ({ data, isLoading }: LeaveBalanceTableProps) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Leave Type</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Utilization %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <FileX className="h-12 w-12 text-gray-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No data found</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm">
            No leave balance data found for the selected criteria. Try adjusting your filters.
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
              <TableCell className="font-medium">Total Allocated Days</TableCell>
              <TableCell>{data.totalAllocated}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Used Days</TableCell>
              <TableCell>{data.totalUsed}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Remaining Days</TableCell>
              <TableCell>{data.totalRemaining}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Overall Utilization Rate</TableCell>
              <TableCell>{data.utilizationRate?.toFixed(2)}%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Breakdown by Leave Type */}
      {data.breakdown && data.breakdown.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Utilization %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.breakdown.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.leaveTypeName}</TableCell>
                  <TableCell>{item.allocated}</TableCell>
                  <TableCell>{item.used}</TableCell>
                  <TableCell>{item.remaining}</TableCell>
                  <TableCell>{item.utilizationRate?.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell>{data.totalAllocated}</TableCell>
                <TableCell>{data.totalUsed}</TableCell>
                <TableCell>{data.totalRemaining}</TableCell>
                <TableCell>{data.utilizationRate?.toFixed(2)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default LeaveBalanceTable;