
import { TimesheetEntry, Project } from "@/lib/timesheet-service";
import { User } from "@/lib/user-service";
import { formatDateDisplay } from "@/lib/date-utils";

export const processProjectDistribution = (
  reportData: TimesheetEntry[],
  projectMap: Map<string, Project>
) => {
  const projectHours: Record<string, number> = {};
  
  reportData.forEach((entry) => {
    const projectId = entry.project_id;
    projectHours[projectId] = (projectHours[projectId] || 0) + entry.hours_logged;
  });
  
  return Object.keys(projectHours).map((projectId) => {
    const project = projectMap.get(projectId);
    return {
      name: project?.name || "Unknown Project",
      value: projectHours[projectId],
    };
  }).sort((a, b) => b.value - a.value);
};

export const processEmployeeDistribution = (
  reportData: TimesheetEntry[],
  userMap: Map<string, User>
) => {
  const employeeHours: Record<string, number> = {};
  
  reportData.forEach((entry) => {
    const userId = entry.user_id;
    employeeHours[userId] = (employeeHours[userId] || 0) + entry.hours_logged;
  });
  
  return Object.keys(employeeHours).map((userId) => {
    const employee = userMap.get(userId);
    return {
      name: employee?.full_name || "Unknown Employee",
      value: employeeHours[userId],
    };
  }).sort((a, b) => b.value - a.value);
};

export const processDailyDistribution = (reportData: TimesheetEntry[]) => {
  const dailyHours: Record<string, number> = {};
  
  reportData.forEach((entry) => {
    const date = new Date(entry.entry_date);
    const dateStr = formatDateDisplay(date);
    dailyHours[dateStr] = (dailyHours[dateStr] || 0) + entry.hours_logged;
  });
  
  return Object.keys(dailyHours).map((date) => ({
    date,
    hours: dailyHours[date],
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
