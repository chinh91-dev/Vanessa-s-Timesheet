
import React from "react";
import { TimesheetEntry, Project } from "@/lib/timesheet-service";
import { User } from "@/lib/user-service";
import ProjectDistributionChart from "./charts/ProjectDistributionChart";
import EmployeeDistributionChart from "./charts/EmployeeDistributionChart";
import DailyDistributionChart from "./charts/DailyDistributionChart";
import LoadingChartsState from "./charts/LoadingChartsState";
import EmptyChartsState from "./charts/EmptyChartsState";
import { 
  processProjectDistribution, 
  processEmployeeDistribution, 
  processDailyDistribution 
} from "./charts/dataProcessors";

interface ReportChartsProps {
  reportData: TimesheetEntry[];
  projects: Project[];
  users: User[];
  isLoading: boolean;
}

const ReportCharts = ({ reportData, projects, users, isLoading }: ReportChartsProps) => {
  // Create maps for quick lookups
  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(project => map.set(project.id, project));
    return map;
  }, [projects]);
  
  const userMap = React.useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(user => map.set(user.id, user));
    return map;
  }, [users]);

  // Process data for charts
  const projectDistribution = React.useMemo(() => 
    processProjectDistribution(reportData, projectMap), 
    [reportData, projectMap]
  );

  const employeeDistribution = React.useMemo(() => 
    processEmployeeDistribution(reportData, userMap), 
    [reportData, userMap]
  );

  const dailyDistribution = React.useMemo(() => 
    processDailyDistribution(reportData), 
    [reportData]
  );

  if (isLoading) {
    return <LoadingChartsState />;
  }

  if (reportData.length === 0) {
    return <EmptyChartsState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProjectDistributionChart data={projectDistribution} />
      <EmployeeDistributionChart data={employeeDistribution} />
      <DailyDistributionChart data={dailyDistribution} />
    </div>
  );
};

export default ReportCharts;
