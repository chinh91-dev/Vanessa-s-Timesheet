
import React from "react";
import { Button } from "@/components/ui/button";
import { isValidDateRange, DateRange } from "@/lib/date-range-utils";

interface ActionButtonsProps {
  tempRange: DateRange;
  onApply: (close: () => void) => void;
  onCancel: (close: () => void) => void;
  close: () => void;
}

export const ActionButtons = ({ tempRange, onApply, onCancel, close }: ActionButtonsProps) => {
  return (
    <div className="mt-6 pt-4 border-t border-border space-y-2">
      <Button
        type="button"
        onClick={() => onApply(close)}
        className="w-full"
        size="sm"
        disabled={!isValidDateRange(tempRange)}
      >
        Apply
      </Button>
      <Button
        type="button"
        onClick={() => onCancel(close)}
        variant="outline"
        className="w-full"
        size="sm"
      >
        Cancel
      </Button>
    </div>
  );
};
