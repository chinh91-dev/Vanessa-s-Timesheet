import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Calendar, User, MapPin, Loader2 } from 'lucide-react';
import { fetchHRIncidents, type HRIncident } from '@/lib/ohs-service';
import { useToast } from '@/hooks/use-toast';

interface HRIncidentListProps {
  searchTerm: string;
  statusFilter: string;
  natureFilter: string;
  onEditIncident: (incident: HRIncident) => void;
  refreshTrigger?: number;
}

const HRIncidentList: React.FC<HRIncidentListProps> = ({
  searchTerm,
  statusFilter,
  natureFilter,
  onEditIncident,
  refreshTrigger = 0,
}) => {
  const [incidents, setIncidents] = useState<HRIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHRIncidents();
        setIncidents(data);
      } catch (err) {
        console.error('Error fetching HR incidents:', err);
        setError('Failed to load HR incidents');
        toast({
          title: "Error",
          description: "Failed to load HR incidents. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadIncidents();
  }, [refreshTrigger, toast]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading HR incidents...</p>
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

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch = 
      incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.prepared_by.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    
    let matchesNature = natureFilter === 'all';
    if (!matchesNature) {
      switch (natureFilter) {
        case 'workplace_injury':
          matchesNature = incident.nature_workplace_injury;
          break;
        case 'harassment_discrimination':
          matchesNature = incident.nature_harassment_discrimination;
          break;
        case 'policy_violation':
          matchesNature = incident.nature_policy_violation;
          break;
        case 'other':
          matchesNature = incident.nature_other;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesNature;
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNatureTypes = (incident: HRIncident) => {
    const types: string[] = [];
    if (incident.nature_workplace_injury) types.push('Workplace Injury');
    if (incident.nature_harassment_discrimination) types.push('Harassment/Discrimination');
    if (incident.nature_policy_violation) types.push('Policy Violation');
    if (incident.nature_other) types.push('Other');
    return types;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (filteredIncidents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No HR incidents found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredIncidents.map((incident) => {
        const natureTypes = getNatureTypes(incident);
        
        return (
          <Card key={incident.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">
                        {incident.report_number || 'HR Incident'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {incident.prepared_by}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {incident.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(incident.incident_date)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditIncident(incident)}
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
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {incident.description}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status}
                    </Badge>
                    {natureTypes.map((type) => (
                      <Badge key={type} variant="outline">
                        {type}
                      </Badge>
                    ))}
                  </div>
                  
                  {incident.individuals_involved && incident.individuals_involved.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>
                        {incident.individuals_involved.length} individual(s) involved
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

export default HRIncidentList;
