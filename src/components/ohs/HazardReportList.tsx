import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Calendar, User, MapPin, Loader2 } from 'lucide-react';
import { fetchHazardReports, type HazardReport } from '@/lib/ohs-service';
import { useToast } from '@/hooks/use-toast';

interface HazardReportListProps {
  searchTerm: string;
  statusFilter: string;
  categoryFilter: string;
  onEditReport: (report: HazardReport) => void;
  refreshTrigger?: number;
}

const HazardReportList: React.FC<HazardReportListProps> = ({
  searchTerm,
  statusFilter,
  categoryFilter,
  onEditReport,
  refreshTrigger = 0,
}) => {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHazardReports();
        setReports(data);
      } catch (err) {
        console.error('Error fetching hazard reports:', err);
        setError('Failed to load hazard reports');
        toast({
          title: "Error",
          description: "Failed to load hazard reports. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [refreshTrigger, toast]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading hazard reports...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.employee_reporter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.exact_location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-red-100 text-red-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Under Review':
        return 'bg-blue-100 text-blue-800';
      case 'Closed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevel = (rating: number) => {
    if (rating <= 4) return { level: 'Low', color: 'bg-green-100 text-green-800' };
    if (rating <= 9) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    if (rating <= 16) return { level: 'High', color: 'bg-orange-100 text-orange-800' };
    return { level: 'Extreme', color: 'bg-red-100 text-red-800' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (filteredReports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No hazard reports found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredReports.map((report) => {
        const riskLevel = getRiskLevel(report.initial_risk_rating);
        const residualRiskLevel = report.residual_risk_rating ? getRiskLevel(report.residual_risk_rating) : null;
        
        return (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{report.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {report.employee_reporter_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {report.exact_location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(report.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditReport(report)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                    <Badge variant="outline">
                      {report.category}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Initial Risk:</span>
                      <Badge className={riskLevel.color}>
                        {riskLevel.level} ({report.initial_risk_rating})
                      </Badge>
                    </div>
                    {residualRiskLevel && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Residual Risk:</span>
                        <Badge className={residualRiskLevel.color}>
                          {residualRiskLevel.level} ({report.residual_risk_rating})
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {report.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span className={new Date(report.due_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {formatDate(report.due_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default HazardReportList;