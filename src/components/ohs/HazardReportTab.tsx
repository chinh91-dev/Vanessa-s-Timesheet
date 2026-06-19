import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, AlertTriangle, Filter, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HazardReportForm from './HazardReportForm';
import HazardReportList from './HazardReportList';
import { Badge } from '@/components/ui/badge';
import { fetchHazardReports, type HazardReport } from '@/lib/ohs-service';

const HazardReportTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<HazardReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    loading: true
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const reports = await fetchHazardReports();
        const statusCounts = reports.reduce((acc, report) => {
          acc.total++;
          switch (report.status) {
            case 'Open':
              acc.open++;
              break;
            case 'In Progress':
              acc.inProgress++;
              break;
            case 'Closed':
              acc.closed++;
              break;
          }
          return acc;
        }, { total: 0, open: 0, inProgress: 0, closed: 0 });

        setStats({
          ...statusCounts,
          loading: false
        });
      } catch (error) {
        console.error('Error loading hazard report stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, [refreshTrigger]);

  const handleNewReport = () => {
    setEditingReport(null);
    setShowForm(true);
  };

  const handleEditReport = (report: HazardReport) => {
    setEditingReport(report);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReport(null);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-destructive">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.open}
                </p>
              </div>
              <Badge variant="destructive" className="h-8 px-3">Open</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.inProgress}
                </p>
              </div>
              <Badge variant="secondary" className="h-8 px-3">In Progress</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.closed}
                </p>
              </div>
              <Badge className="h-8 px-3 bg-green-100 text-green-800">Closed</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Hazard & Risk Reports</CardTitle>
            <Button onClick={handleNewReport}>
              <Plus className="h-4 w-4 mr-2" />
              New Hazard Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports by title, reporter, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Physical">Physical</SelectItem>
                <SelectItem value="Chemical">Chemical</SelectItem>
                <SelectItem value="Biological">Biological</SelectItem>
                <SelectItem value="Mechanical-Electrical">Mechanical-Electrical</SelectItem>
                <SelectItem value="Psychological">Psychological</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <HazardReportList
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        onEditReport={handleEditReport}
        refreshTrigger={refreshTrigger}
      />

      {/* Form Dialog */}
      {showForm && (
        <HazardReportForm
          report={editingReport}
          open={showForm}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default HazardReportTab;