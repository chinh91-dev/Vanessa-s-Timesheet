
import React from "react";
import WeeklyViewContainer from "./weekly-view/WeeklyViewContainer";

interface WeeklyViewProps {
  viewAsUserId?: string | null;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({ viewAsUserId }) => {
  return <WeeklyViewContainer viewAsUserId={viewAsUserId} />;
};

export default WeeklyView;
