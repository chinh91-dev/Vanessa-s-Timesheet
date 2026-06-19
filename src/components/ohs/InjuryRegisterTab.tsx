import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Filter, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InjuryRegisterForm from './InjuryRegisterForm';
import InjuryRegisterList from './InjuryRegisterList';
import { Badge } from '@/components/ui/badge';
import { fetchInjuryRegisters, type InjuryRegister } from '@/lib/ohs-service';

const InjuryRegisterTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingInjury, setEditingInjury] = useState<InjuryRegister | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    firstAid: 0,
    medical: 0,
    lostTime: 0,
    serious: 0,
    loading: true
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const injuries = await fetchInjuryRegisters();
        const severityCounts = injuries.reduce((acc, injury) => {
          acc.total++;
          switch (injury.injury_severity) {
            case 'First Aid':
              acc.firstAid++;
              break;
            case 'Medical Treatment':
              acc.medical++;
              break;
            case 'Lost Time':
              acc.lostTime++;
              break;
            case 'Permanent Disability':
            case 'Fatality':
              acc.serious++;
              break;
          }
          return acc;
        }, { total: 0, firstAid: 0, medical: 0, lostTime: 0, serious: 0 });

        setStats({
          ...severityCounts,
          loading: false
        });
      } catch (error) {
        console.error('Error loading injury register stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, [refreshTrigger]);

  const handleNewInjury = () => {
    setEditingInjury(null);
    setShowForm(true);
  };

  const handleEditInjury = (injury: InjuryRegister) => {
    setEditingInjury(injury);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingInjury(null);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Injuries</p>
                <p className="text-2xl font-bold">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">First Aid</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.firstAid}
                </p>
              </div>
              <Badge className="h-8 px-3 bg-blue-100 text-blue-800">First Aid</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Medical Treatment</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.medical}
                </p>
              </div>
              <Badge className="h-8 px-3 bg-yellow-100 text-yellow-800">Medical</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lost Time</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.lostTime}
                </p>
              </div>
              <Badge className="h-8 px-3 bg-orange-100 text-orange-800">Lost Time</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Serious</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.serious}
                </p>
              </div>
              <Badge variant="destructive" className="h-8 px-3">Serious</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Register of Injuries</CardTitle>
            <Button onClick={handleNewInjury}>
              <Plus className="h-4 w-4 mr-2" />
              New Injury Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by injured person, location, or description..."
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
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="First Aid">First Aid</SelectItem>
                <SelectItem value="Medical Treatment">Medical Treatment</SelectItem>
                <SelectItem value="Lost Time">Lost Time</SelectItem>
                <SelectItem value="Permanent Disability">Permanent Disability</SelectItem>
                <SelectItem value="Fatality">Fatality</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Important Notice */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Important Notice</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  All workplace injuries must be reported immediately. Serious injuries may require notification to WorkSafe Victoria within 24 hours.
                  This register maintains confidential medical information and should only be accessed by authorised personnel.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Injury Reports List */}
      <InjuryRegisterList
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        severityFilter={severityFilter}
        onEditInjury={handleEditInjury}
        refreshTrigger={refreshTrigger}
      />

      {/* Form Dialog */}
      {showForm && (
        <InjuryRegisterForm
          injury={editingInjury}
          open={showForm}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default InjuryRegisterTab;