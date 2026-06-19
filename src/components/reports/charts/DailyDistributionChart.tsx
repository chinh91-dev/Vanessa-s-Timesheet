
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { CHART_DIMENSIONS } from "./chartConfig";

interface DailyDistributionChartProps {
  data: Array<{ date: string; hours: number }>;
}

const DailyDistributionChart = ({ data }: DailyDistributionChartProps) => {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Daily Distribution</CardTitle>
        <CardDescription>Hours logged per day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{ dailyDistribution: {} }}>
          <BarChart
            data={data}
            margin={CHART_DIMENSIONS.barChart.margin}
          >
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} hours`, 'Hours']} />
            <Legend />
            <Bar dataKey="hours" name="Hours" fill="#8B5CF6" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default DailyDistributionChart;
