import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ClipboardList, Filter, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkplaceInspectionForm from './WorkplaceInspectionForm';
import WorkplaceInspectionList from './WorkplaceInspectionList';
import { Badge } from '@/components/ui/badge';
import { fetchWorkplaceInspections, type WorkplaceInspection } from '@/lib/ohs-service';

const WorkplaceInspectionTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState<WorkplaceInspection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    compliant: 0,
    nonCompliant: 0,
    requiresAction: 0,
    loading: true
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const inspections = await fetchWorkplaceInspections();
        const statusCounts = inspections.reduce((acc, inspection) => {
          acc.total++;
          switch (inspection.overall_status) {
            case 'Compliant':
              acc.compliant++;
              break;
            case 'Non-Compliant':
              acc.nonCompliant++;
              break;
            case 'Requires Action':
              acc.requiresAction++;
              break;
          }
          return acc;
        }, { total: 0, compliant: 0, nonCompliant: 0, requiresAction: 0 });

        setStats({
          ...statusCounts,
          loading: false
        });
      } catch (error) {
        console.error('Error loading workplace inspection stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, [refreshTrigger]);

  const handleNewInspection = () => {
    setEditingInspection(null);
    setShowForm(true);
  };

  const handleEditInspection = (inspection: WorkplaceInspection) => {
    setEditingInspection(inspection);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingInspection(null);
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
                <p className="text-sm font-medium text-muted-foreground">Total Inspections</p>
                <p className="text-2xl font-bold">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
                </p>
              </div>
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliant</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.compliant}
                </p>
              </div>
              <Badge className="h-8 px-3 bg-green-100 text-green-800">Compliant</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.nonCompliant}
                </p>
              </div>
              <Badge variant="destructive" className="h-8 px-3">Non-Compliant</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requires Action</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.requiresAction}
                </p>
              </div>
              <Badge variant="secondary" className="h-8 px-3 bg-orange-100 text-orange-800">Action Required</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workplace Inspections</CardTitle>
            <Button onClick={handleNewInspection}>
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inspections by site, area, or inspector..."
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
                <SelectItem value="Compliant">Compliant</SelectItem>
                <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                <SelectItem value="Requires Action">Requires Action</SelectItem>
              </SelectContent>
            </Select>

            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                <SelectItem value="Main Building">Main Building</SelectItem>
                <SelectItem value="Warehouse">Warehouse</SelectItem>
                <SelectItem value="Production Floor">Production Floor</SelectItem>
                <SelectItem value="Office Building">Office Building</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      <WorkplaceInspectionList
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        siteFilter={siteFilter}
        onEditInspection={handleEditInspection}
        refreshTrigger={refreshTrigger}
      />

      {/* Form Dialog */}
      {showForm && (
        <WorkplaceInspectionForm
          inspection={editingInspection}
          open={showForm}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default WorkplaceInspectionTab;