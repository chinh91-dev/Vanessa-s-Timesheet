import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ExpenseReportChartsProps {
  data: {
    byCategory: Record<string, number>;
    byUser: Record<string, number>;
    byStatus: {
      draft: number;
      submitted: number;
      approved: number;
      rejected: number;
    };
    totalAmount: number;
    approvedAmount: number;
    pendingAmount: number;
  };
}

const ExpenseReportCharts: React.FC<ExpenseReportChartsProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Prepare data for charts
  const categoryData = Object.entries(data.byCategory).map(([name, value]) => ({
    name,
    value,
    formattedValue: formatCurrency(value)
  }));

  const userTotalData = Object.entries(data.byUser)
    .map(([name, value]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      value,
      formattedValue: formatCurrency(value)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 users

  const statusData = [
    { name: 'Draft', value: data.byStatus.draft, color: '#6B7280' },
    { name: 'Pending', value: data.byStatus.submitted, color: '#3B82F6' },
    { name: 'Approved', value: data.byStatus.approved, color: '#10B981' },
    { name: 'Rejected', value: data.byStatus.rejected, color: '#EF4444' }
  ].filter(item => item.value > 0);

  const summaryData = [
    { name: 'Total Expenses', value: data.totalAmount, color: '#8B5CF6' },
    { name: 'Approved', value: data.approvedAmount, color: '#10B981' },
    { name: 'Pending Approval', value: data.pendingAmount, color: '#F59E0B' }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

  const renderCustomTooltip = (active: boolean, payload: any[], label: string) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{data.fullName || data.name}</p>
          <p className="text-sm text-blue-600">
            {data.formattedValue || formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Expenses by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">
              No category data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Users by Expense Amount */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Expense Amount</CardTitle>
        </CardHeader>
        <CardContent>
          {userTotalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userTotalData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip content={({ active, payload, label }) => 
                  renderCustomTooltip(active || false, payload || [], label || '')
                } />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">
              No user data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">
              No status data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summaryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value">
                {summaryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseReportCharts;