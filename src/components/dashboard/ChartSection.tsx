import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
  "#8884D8", "#82CA9D", "#FFBDD3", "#FF6B6B",
  "#6A7FDB", "#9ACEEB"
];

interface ChartSectionProps {
  projectsChartData: Array<{ name: string; hours: number }>;
  customersChartData: Array<{ name: string; hours: number }>;
  isLoading: boolean;
  hasError: boolean;
}

const ChartSection: React.FC<ChartSectionProps> = ({
  projectsChartData,
  customersChartData,
  isLoading,
  hasError,
}) => {
  // Stable skeleton bar heights — previously regenerated via Math.random()
  // on every render which caused visible flicker during the loading state.
  const skeletonHeights = useMemo(
    () => Array.from({ length: 5 }, () => Math.random() * 60 + 20),
    []
  );

  const renderContent = (data: Array<{ name: string; hours: number }>, type: "bar" | "pie") => {
    if (isLoading) {
      return (
        <div className="h-80 flex items-center justify-center w-full">
          {type === "bar" ? (
            <div className="w-full h-full flex items-end justify-between gap-2 px-4 pb-8">
              {skeletonHeights.map((h, i) => (
                <Skeleton key={i} className="w-full rounded-t-md" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : (
            <Skeleton className="h-64 w-64 rounded-full" />
          )}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="h-80 flex items-center justify-center text-red-500 bg-red-50/50 dark:bg-red-950/50 rounded-lg border border-red-100 dark:border-red-900">
          <p>Error loading {type === "bar" ? "project" : "customer"} data. Please refresh the page.</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed border-border">
          <p>No {type === "bar" ? "timesheet" : "customer"} data available</p>
        </div>
      );
    }

    if (type === "bar") {
      return (
        <ChartContainer className="aspect-video h-80 w-full" config={{}}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'rgba(128,128,128,0.1)' }}
              content={<ChartTooltipContent className="shadow-lg rounded-lg" />}
            />
            <Bar
              dataKey="hours"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            />
          </BarChart>
        </ChartContainer>
      );
    }

    return (
      <ChartContainer className="aspect-video h-80 w-full" config={{}}>
        <PieChart>
          <Pie
            data={data}
            dataKey="hours"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent className="shadow-lg rounded-lg" />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
          />
        </PieChart>
      </ChartContainer>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>Hours by Project</CardTitle>
          <CardDescription>Distribution of your hours across projects</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent(projectsChartData, "bar")}
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>Hours by Customer</CardTitle>
          <CardDescription>Distribution of your hours across customers</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent(customersChartData, "pie")}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartSection;
