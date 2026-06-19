import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { ChartContainer } from "@/components/ui/chart";
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip } from "recharts";
import { CheckCircle2, Clock, ClipboardCheck, Calendar, TimerIcon, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStatsProps {
  hasEntries: boolean;
  expectedDaysToDate: number;
  daysLoggedToDate: number;
  weekProgress: number;
  completeWeek: boolean;
  allDaysHaveEntries: boolean;
  isTodayComplete: boolean;
  workingDays: number;
  weeklyTarget: number;
  isLoading?: boolean;
}

const getColorByPercentage = (percentage: number): string => {
  if (percentage <= 25) {
    return "#ea384c"; // Red for 25% or lower
  } else if (percentage < 100) {
    return "#FFBB28"; // Yellow for between 25% and 100%
  } else {
    return "#00C49F"; // Green for 100%
  }
};

const DashboardStats: React.FC<DashboardStatsProps> = ({
  hasEntries,
  expectedDaysToDate,
  daysLoggedToDate,
  weekProgress,
  completeWeek,
  allDaysHaveEntries,
  isTodayComplete,
  workingDays,
  weeklyTarget,
  isLoading = false
}) => {
  const statsData = [{
    name: "Week Progress",
    value: Math.round(weekProgress),
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    description: `${Math.round(weekProgress)}% Complete`,
    color: getColorByPercentage(Math.round(weekProgress))
  }, {
    name: "Status",
    value: Math.round(completeWeek ? 100 : weekProgress),
    icon: <Calendar className="h-5 w-5 text-amber-500" />,
    description: completeWeek && allDaysHaveEntries ? "Complete" : isTodayComplete ? "In Progress" : "Pending",
    color: getColorByPercentage(completeWeek ? 100 : Math.round(weekProgress))
  }];

  const radialData = statsData.map(item => ({
    name: item.name,
    value: item.value,
    fill: item.color
  }));

  if (!import.meta.env.DEV) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mb-4 overflow-hidden shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <div className="ml-auto">
              <Skeleton className="h-4 w-24" />
            </div>
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64 mt-2" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            <div className="h-[250px] flex items-center justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <TimerIcon className="h-5 w-5 text-blue-500" />
          </div>
          Timesheet Status
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">
            <Settings className="h-3.5 w-3.5" />
            {workingDays} day schedule
          </div>
        </CardTitle>
        <CardDescription>Your weekly timesheet statistics based on your {workingDays}-day work schedule</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-[60%]">Metric</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Has entries
                  </TableCell>
                  <TableCell className={hasEntries ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${hasEntries ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"}`}>
                      {hasEntries ? "Yes" : "No"}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Expected days to date
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">{expectedDaysToDate} days</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-purple-500" />
                    Days worked to date
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">{daysLoggedToDate} days</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium flex items-center gap-2.5">
                    <Settings className="h-4 w-4 text-orange-500" />
                    Days expected per week
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">{workingDays} days</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    Week completion
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${Math.min(weekProgress, 100)}%`,
                            backgroundColor: getColorByPercentage(weekProgress)
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: getColorByPercentage(weekProgress) }}>
                        {weekProgress.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    All working days have entries
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${allDaysHaveEntries ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"}`}>
                      {allDaysHaveEntries ? "Yes" : "No"}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="h-[250px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270} barSize={15}>
                <RadialBar
                  background={{ fill: "#f3f4f6" }}
                  dataKey="value"
                  cornerRadius={15}
                  label={{
                    position: 'insideStart',
                    fill: '#fff',
                    formatter: (value: number) => `${value}%`,
                    style: { fontWeight: 'bold', fontSize: '10px' }
                  }}
                />
                <Legend
                  iconSize={8}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Completion']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardStats;
