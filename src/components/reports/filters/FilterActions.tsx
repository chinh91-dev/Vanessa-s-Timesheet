
import React from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

interface FilterActionsProps {
  generateReport: () => Promise<void>;
  isGeneratingReport: boolean;
}

export const FilterActions = ({
  generateReport,
  isGeneratingReport
}: FilterActionsProps) => {
  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={generateReport}
        size="sm"
        disabled={isGeneratingReport}
        className="whitespace-nowrap"
      >
        {isGeneratingReport ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Generate Report
          </>
        )}
      </Button>
    </div>
  );
};
