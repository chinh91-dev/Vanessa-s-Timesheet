import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useIncidentRealtime } from '@/hooks/useIncidentRealtime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Ticket, Search, Clock, AlertCircle, CheckCircle2, Loader2, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import type { IncidentStatus } from '@/types/incident-types';

const ALL_STATUSES: IncidentStatus[] = ['New', 'Triaged', 'In Progress', 'Resolved', 'Closed'];

const STATUS_BADGE_COLORS: Record<IncidentStatus, string> = {
  New: 'bg-blue-500/10 text-blue-600 border-blue-200',
  Triaged: 'bg-purple-500/10 text-purple-600 border-purple-200',
  'In Progress': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  Resolved: 'bg-green-500/10 text-green-600 border-green-200',
  Closed: 'bg-gray-500/10 text-gray-600 border-gray-200',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'New': { label: 'New', color: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="h-3 w-3" /> },
  'Triaged': { label: 'Triaged', color: 'bg-purple-100 text-purple-800', icon: <Clock className="h-3 w-3" /> },
  'In Progress': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  'Resolved': { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  'Closed': { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'bg-red-100 text-red-800 border-red-200',
  'High': 'bg-orange-100 text-orange-800 border-orange-200',
  'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Low': 'bg-green-100 text-green-800 border-green-200',
};

export default function CustomerMyTicketsPage() {
  const { user } = useCustomerAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<IncidentStatus[]>(['New', 'Triaged', 'In Progress']);
  const [statusOpen, setStatusOpen] = useState(false);

  // Enable real-time updates
  useIncidentRealtime();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['customer-incidents', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          priority:incident_priorities(id, name, color),
          category:incident_categories(id, name),
          incident_project:incident_projects(id, name, project_key)
        `)
        .eq('created_by', user.user_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.user_id,
  });

  const toggleStatus = (status: IncidentStatus) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const filteredIncidents = incidents?.filter(incident => {
    const matchesSearch = searchTerm === '' || 
      incident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.incident_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(incident.status as IncidentStatus);
    
    return matchesSearch && matchesStatus;
  }) || [];

  const statusLabel =
    selectedStatuses.length === 0
      ? 'No Status'
      : selectedStatuses.length === ALL_STATUSES.length
      ? 'All Statuses'
      : `${selectedStatuses.length} selected`;

  const openCount = incidents?.filter(i => !['Resolved', 'Closed'].includes(i.status)).length || 0;
  const resolvedCount = incidents?.filter(i => ['Resolved', 'Closed'].includes(i.status)).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-muted-foreground">
            {incidents?.length || 0} total tickets • {openCount} open • {resolvedCount} resolved
          </p>
        </div>
        <Button onClick={() => navigate('/customer-portal/submit-ticket')}>
          <Ticket className="h-4 w-4 mr-2" />
          Submit New Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket number or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 min-w-[130px] justify-between">
              <span className="truncate text-sm">{statusLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-xs font-medium text-muted-foreground">Filter by Status</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setSelectedStatuses([...ALL_STATUSES])}>All</Button>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setSelectedStatuses([])}>Clear</Button>
                </div>
              </div>
              {ALL_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2 py-0.5 cursor-pointer" onClick={() => toggleStatus(status)}>
                  <Checkbox checked={selectedStatuses.includes(status)} onCheckedChange={() => toggleStatus(status)} className="h-4 w-4" />
                  <Badge variant="outline" className={`text-xs px-1.5 ${STATUS_BADGE_COLORS[status]}`}>{status}</Badge>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active status chips */}
      {selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUSES.length && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedStatuses.map((s) => (
            <Badge key={s} variant="outline" className={`text-xs gap-1 cursor-pointer ${STATUS_BADGE_COLORS[s]}`} onClick={() => toggleStatus(s)}>
              {s}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}

      {/* Tickets List */}
      {filteredIncidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tickets found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || selectedStatuses.length < ALL_STATUSES.length
                ? 'Try adjusting your search or filters'
                : "You haven't submitted any tickets yet"}
            </p>
            {!searchTerm && selectedStatuses.length === ALL_STATUSES.length && (
              <Button onClick={() => navigate('/customer-portal/submit-ticket')}>
                Submit Your First Ticket
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG['New'];
            const priorityColor = PRIORITY_COLORS[incident.priority?.name] || PRIORITY_COLORS['Medium'];
            
            return (
              <Card 
                key={incident.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/customer-portal/my-tickets/${incident.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">
                          {incident.incident_number || `#${incident.id.slice(0, 8)}`}
                        </span>
                        <Badge className={statusConfig.color} variant="secondary">
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                        {incident.priority && (
                          <Badge className={priorityColor} variant="outline">
                            {incident.priority.name}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium truncate">{incident.title}</h3>
                      {incident.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {incident.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {incident.category && (
                          <span>{incident.category.name}</span>
                        )}
                        <span>
                          Created {format(new Date(incident.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
