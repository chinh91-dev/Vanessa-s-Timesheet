
import React from "react";

const LoadingState: React.FC = () => {
  return (
    <div className="flex justify-center py-10 animate-pulse">
      <div className="text-center">
        <div className="text-lg">Loading timesheet data...</div>
      </div>
    </div>
  );
};

export default LoadingState;
