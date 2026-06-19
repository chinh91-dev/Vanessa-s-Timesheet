import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { IncidentService } from '@/lib/incident-service';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { usePortalGroups, PortalGroup } from '@/hooks/usePortalGroups';
import { usePortalGroupRequestTypes } from '@/hooks/usePortalGroupRequestTypes';
import { PortalRequestType } from '@/hooks/usePortalRequestTypes';
import { DynamicFormRenderer } from '@/components/customer-portal/DynamicFormRenderer';
import { 
  ChevronRight, 
  Ticket, 
  AlertTriangle, 
  Zap, 
  Shield, 
  Monitor,
  Server,
  Database,
  Cloud,
  HelpCircle,
  Settings,
  ShoppingCart,
  User,
  Folder,
  FileText,
  Wrench,
  Mail,
  Phone,
  Globe,
  Lock,
  Key,
  Cpu,
  HardDrive,
  Wifi,
  Printer,
  Laptop,
  Smartphone
} from 'lucide-react';

// Icon mapping for portal groups and request types
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Ticket': Ticket,
  'AlertTriangle': AlertTriangle,
  'Zap': Zap,
  'Shield': Shield,
  'Monitor': Monitor,
  'Server': Server,
  'Database': Database,
  'Cloud': Cloud,
  'HelpCircle': HelpCircle,
  'Settings': Settings,
  'ShoppingCart': ShoppingCart,
  'User': User,
  'Folder': Folder,
  'FileText': FileText,
  'Wrench': Wrench,
  'Mail': Mail,
  'Phone': Phone,
  'Globe': Globe,
  'Lock': Lock,
  'Key': Key,
  'Cpu': Cpu,
  'HardDrive': HardDrive,
  'Wifi': Wifi,
  'Printer': Printer,
  'Laptop': Laptop,
  'Smartphone': Smartphone,
};

const getIcon = (iconName: string) => {
  return iconMap[iconName] || HelpCircle;
};

interface IncidentProject {
  id: string;
  name: string;
  description?: string;
  customer_id: string;
}

type Step = 'groups' | 'request-types' | 'form';

export default function CustomerSubmitTicketPage() {
  const { user } = useCustomerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<Step>('groups');
  const [selectedGroup, setSelectedGroup] = useState<PortalGroup | null>(null);
  const [selectedRequestType, setSelectedRequestType] = useState<PortalRequestType | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Fetch portal groups for this customer
  const { data: portalGroups = [], isLoading: groupsLoading } = usePortalGroups(user?.company_id);

  // Filter to only active groups
  const activeGroups = useMemo(() => 
    portalGroups.filter(g => g.is_active), 
    [portalGroups]
  );

  // Fetch request types for selected group
  const { data: requestTypes = [], isLoading: requestTypesLoading } = usePortalGroupRequestTypes(
    selectedGroup?.id || null
  );

  // Fetch customer's incident projects
  const { data: projects = [] } = useQuery({
    queryKey: ['customer-incident-projects', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      
      const { data, error } = await supabase
        .from('incident_projects')
        .select('*')
        .eq('customer_id', user.company_id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as IncidentProject[];
    },
    enabled: !!user?.company_id
  });

  // Fetch incident priorities
  const { data: priorities = [] } = useQuery({
    queryKey: ['incident-priorities'],
    queryFn: () => IncidentService.getPriorities()
  });

  // Create incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: async () => {
      const defaultPriority = priorities.find(p => p.name === 'Medium') || priorities[0];
      
      // Extract title/summary from form values
      const title = formValues.summary || formValues.title || formValues.subject || 'Support Request';
      const description = formValues.description || formValues.body || formValues.details || '';

      return await IncidentService.createIncident({
        title,
        description,
        impact_description: formValues.impact || '',
        incident_project_id: selectedProjectId,
        category_id: selectedRequestType?.id || null,
        priority_id: defaultPriority?.id || null,
        assigned_to: null
      });
    },
    onSuccess: (incident) => {
      toast({
        title: "Request Submitted Successfully",
        description: `Your request #${incident.incident_number} has been created and our team will respond shortly.`,
      });
      navigate('/customer-portal/dashboard');
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Unable to submit your request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleGroupSelect = (group: PortalGroup) => {
    setSelectedGroup(group);
    setCurrentStep('request-types');
  };

  const handleRequestTypeSelect = (requestType: PortalRequestType) => {
    setSelectedRequestType(requestType);
    setFormValues({});
    setCurrentStep('form');
  };

  const handleFormChange = (name: string, value: string) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleBack = () => {
    if (currentStep === 'form') {
      setSelectedRequestType(null);
      setCurrentStep('request-types');
    } else if (currentStep === 'request-types') {
      setSelectedGroup(null);
      setCurrentStep('groups');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = selectedRequestType?.form_schema?.fields?.filter(f => f.required) || [];
    const hasTitle = formValues.summary || formValues.title || formValues.subject;
    
    if (!hasTitle && requiredFields.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a summary for your request.",
        variant: "destructive"
      });
      return;
    }

    for (const field of requiredFields) {
      if (!formValues[field.name]) {
        toast({
          title: "Missing Information",
          description: `Please fill in the "${field.label}" field.`,
          variant: "destructive"
        });
        return;
      }
    }

    if (!selectedProjectId && projects.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please select a service project.",
        variant: "destructive"
      });
      return;
    }

    createIncidentMutation.mutate();
  };

  // Auto-select project if only one
  React.useEffect(() => {
    if (projects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Generate auto description for groups
  const getGroupDescription = (group: PortalGroup) => {
    const typeNames = requestTypes
      .filter(rt => group.request_types?.includes(rt.id))
      .map(rt => rt.name)
      .slice(0, 3);
    
    if (typeNames.length === 0) return group.description || '';
    return typeNames.join(', ') + (group.request_types && group.request_types.length > 3 ? '...' : '');
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Service Projects Available</h2>
          <p className="text-muted-foreground">
            You don't have access to any service projects. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Step 3: Form
  if (currentStep === 'form' && selectedRequestType && selectedGroup) {
    const Icon = getIcon(selectedRequestType.icon);
    
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSelectedGroup(null);
              setSelectedRequestType(null);
              setCurrentStep('groups');
            }}
            className="p-0 h-auto text-primary hover:text-primary/80"
          >
            Service Catalog
          </Button>
          <ChevronRight className="h-4 w-4" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="p-0 h-auto text-primary hover:text-primary/80"
          >
            {selectedGroup.name}
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span>{selectedRequestType.name}</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Icon className="h-5 w-5" />
              <span>{selectedRequestType.name}</span>
            </CardTitle>
            {selectedRequestType.description && (
              <CardDescription>{selectedRequestType.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service Project Selector (if multiple) */}
              {projects.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service Project *</label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Dynamic Form Fields */}
              <DynamicFormRenderer
                fields={selectedRequestType.form_schema?.fields || []}
                values={formValues}
                onChange={handleFormChange}
              />

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={createIncidentMutation.isPending}
                >
                  {createIncidentMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Request Type Selection
  if (currentStep === 'request-types' && selectedGroup) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="p-0 h-auto text-primary hover:text-primary/80"
          >
            Service Catalog
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span>{selectedGroup.name}</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">What can we help you with?</h1>
          <p className="text-muted-foreground">
            Select the type of request you'd like to submit
          </p>
        </div>

        {requestTypesLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading request types...</p>
          </div>
        ) : requestTypes.length === 0 ? (
          <div className="text-center py-8">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No request types available for this category.</p>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              Go Back
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requestTypes.map((requestType) => {
              const Icon = getIcon(requestType.icon);
              return (
                <Card 
                  key={requestType.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
                  onClick={() => handleRequestTypeSelect(requestType)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{requestType.name}</h3>
                        {requestType.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {requestType.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
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

  // Step 1: Portal Group Selection (default)
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Service Catalog</h1>
        <p className="text-muted-foreground">
          Select a category to get started
        </p>
      </div>

      {groupsLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading service catalog...</p>
        </div>
      ) : activeGroups.length === 0 ? (
        <div className="text-center py-12">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Service Categories Available</h2>
          <p className="text-muted-foreground">
            Service categories are being configured. Please check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeGroups.map((group) => {
            const Icon = getIcon(group.icon);
            return (
              <Card 
                key={group.id} 
                className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
                onClick={() => handleGroupSelect(group)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.description || getGroupDescription(group)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground mt-1" />
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
