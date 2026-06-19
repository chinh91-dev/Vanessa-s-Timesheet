
import React from "react";

interface DayTotalHoursProps {
  totalHours: number;
}

const DayTotalHours: React.FC<DayTotalHoursProps> = ({ totalHours }) => {
  if (totalHours <= 0) {
    return null;
  }

  return (
    <div className="flex justify-between items-center py-1 px-2 text-xs font-medium">
      <span>Total:</span>
      <span className="font-bold">{totalHours} hr{totalHours !== 1 ? "s" : ""}</span>
    </div>
  );
};

export default DayTotalHours;
