
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { CHART_COLORS, CHART_DIMENSIONS } from "./chartConfig";

interface EmployeeDistributionChartProps {
  data: Array<{ name: string; value: number }>;
}

const EmployeeDistributionChart = ({ data }: EmployeeDistributionChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Distribution</CardTitle>
        <CardDescription>Hours logged by employee</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{ employeeDistribution: {} }}>
          <PieChart width={CHART_DIMENSIONS.pieChart.width} height={CHART_DIMENSIONS.pieChart.height}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={CHART_DIMENSIONS.pieChart.outerRadius}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} hours`, 'Hours']} />
            <Legend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default EmployeeDistributionChart;
