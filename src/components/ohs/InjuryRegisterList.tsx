import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Eye, Calendar, User, MapPin, FileText, Loader2 } from 'lucide-react';
import { fetchInjuryRegisters, type InjuryRegister } from '@/lib/ohs-service';
import { useToast } from '@/hooks/use-toast';

interface InjuryRegisterListProps {
  searchTerm: string;
  statusFilter: string;
  severityFilter: string;
  onEditInjury: (injury: InjuryRegister) => void;
  refreshTrigger?: number;
}

const InjuryRegisterList: React.FC<InjuryRegisterListProps> = ({
  searchTerm,
  statusFilter,
  severityFilter,
  onEditInjury,
  refreshTrigger = 0,
}) => {
  const [injuries, setInjuries] = useState<InjuryRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadInjuries = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchInjuryRegisters();
        setInjuries(data);
      } catch (err) {
        console.error('Error fetching injury registers:', err);
        setError('Failed to load injury registers');
        toast({
          title: "Error",
          description: "Failed to load injury registers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInjuries();
  }, [refreshTrigger, toast]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading injury registers...</p>
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
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'First Aid': return 'bg-blue-100 text-blue-800';
      case 'Medical Treatment': return 'bg-yellow-100 text-yellow-800';
      case 'Lost Time': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInjuries = injuries.filter((injury) => {
    const matchesSearch = 
      injury.injured_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      injury.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      injury.body_parts_affected.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || injury.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || injury.injury_severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  if (filteredInjuries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No injury reports found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredInjuries.map((injury) => (
        <Card key={injury.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium">{injury.injured_person_name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(injury.incident_date).toLocaleDateString('en-AU')}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {injury.location}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <Badge className={getSeverityColor(injury.injury_severity)}>
                    {injury.injury_severity}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{injury.body_parts_affected}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onEditInjury(injury)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InjuryRegisterList;