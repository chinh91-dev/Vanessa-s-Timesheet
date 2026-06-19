import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Calendar, User, MapPin, ClipboardList, Loader2 } from 'lucide-react';
import { fetchWorkplaceInspections, type WorkplaceInspection } from '@/lib/ohs-service';
import { useToast } from '@/hooks/use-toast';
import { supabaseOHS as supabase } from '@/integrations/supabase-ohs/client';

interface ExtendedWorkplaceInspection extends WorkplaceInspection {
  total_items: number;
  completed_items: number;
}

interface WorkplaceInspectionListProps {
  searchTerm: string;
  statusFilter: string;
  siteFilter: string;
  onEditInspection: (inspection: WorkplaceInspection) => void;
  refreshTrigger?: number;
}

const WorkplaceInspectionList: React.FC<WorkplaceInspectionListProps> = ({
  searchTerm,
  statusFilter,
  siteFilter,
  onEditInspection,
  refreshTrigger = 0,
}) => {
  const [inspections, setInspections] = useState<ExtendedWorkplaceInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadInspections = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWorkplaceInspections();
        
        // Fetch inspection results count for each inspection
        const inspectionsWithCounts = await Promise.all(
          data.map(async (inspection) => {
            try {
              const { data: results, error } = await supabase
                .from('ohs_inspection_results')
                .select('*')
                .eq('inspection_id', inspection.id);
              
              if (error) throw error;
              
              const totalItems = results?.length || 0;
              const completedItems = results?.filter(r => r.status === 'Compliant').length || 0;
              
              return {
                ...inspection,
                total_items: totalItems,
                completed_items: completedItems,
              };
            } catch (err) {
              console.error('Error fetching inspection results:', err);
              return {
                ...inspection,
                total_items: 0,
                completed_items: 0,
              };
            }
          })
        );
        
        setInspections(inspectionsWithCounts);
      } catch (err) {
        console.error('Error fetching workplace inspections:', err);
        setError('Failed to load workplace inspections');
        toast({
          title: "Error",
          description: "Failed to load workplace inspections. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInspections();
  }, [refreshTrigger, toast]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workplace inspections...</p>
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

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch = 
      inspection.site_area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inspection.notes && inspection.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || inspection.overall_status === statusFilter;
    const matchesSite = siteFilter === 'all' || inspection.site_area === siteFilter;
    
    return matchesSearch && matchesStatus && matchesSite;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant':
        return 'bg-green-100 text-green-800';
      case 'Non-Compliant':
        return 'bg-red-100 text-red-800';
      case 'Not Applicable':
        return 'bg-gray-100 text-gray-800';
      case 'Requires Action':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompletionColor = (completed: number, total: number) => {
    const percentage = (completed / total) * 100;
    if (percentage === 100) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (filteredInspections.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No workplace inspections found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredInspections.map((inspection) => {
        const completionPercentage = Math.round((inspection.completed_items / inspection.total_items) * 100);
        
        return (
          <Card key={inspection.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">
                        {inspection.site_area} Inspection
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                       <div className="flex items-center gap-1">
                           <User className="h-4 w-4" />
                           Inspector
                         </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(inspection.inspection_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {inspection.site_area}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditInspection(inspection)}
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
                    <Badge className={getStatusColor(inspection.overall_status)}>
                      {inspection.overall_status}
                    </Badge>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Completion:</span>
                      <span className={`text-sm font-medium ${getCompletionColor(inspection.completed_items, inspection.total_items)}`}>
                        {inspection.completed_items}/{inspection.total_items} ({completionPercentage}%)
                      </span>
                    </div>
                    
                    <div className="w-full sm:w-32 h-2 bg-muted rounded-full">
                      <div 
                        className={`h-2 rounded-full ${
                          completionPercentage === 100 
                            ? 'bg-green-500' 
                            : completionPercentage >= 80 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {inspection.notes && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Notes:</span> {inspection.notes}
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

export default WorkplaceInspectionList;