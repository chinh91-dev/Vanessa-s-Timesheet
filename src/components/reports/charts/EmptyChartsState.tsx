
import React from "react";
import { FileX, Filter } from "lucide-react";

const EmptyChartsState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <FileX className="h-16 w-16 text-gray-400" />
      <div>
        <h3 className="text-xl font-semibold text-gray-900">No data to visualize</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-md">
          No timesheet entries match your current filters. Adjust your filters and generate a report to see visual charts.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-4 py-3 rounded-lg">
        <Filter className="h-4 w-4" />
        <span>Tip: Try widening your date range or removing specific filters</span>
      </div>
    </div>
  );
};

export default EmptyChartsState;
