import React, { useState, useEffect } from 'react';
import { todayLocalYMD } from '@/lib/date-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Camera, Plus, AlertTriangle, CheckCircle, X, Eye } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const inspectionSchema = z.object({
  inspection_date: z.string().min(1, 'Inspection date is required'),
  site_area: z.string().min(1, 'Site/area is required'),
  notes: z.string().optional(),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

interface WorkplaceInspectionFormProps {
  inspection?: any;
  open: boolean;
  onClose: () => void;
}

// Mock inspection items data - would come from database
const mockInspectionItems = [
  {
    id: '1',
    category: 'General Areas',
    item_name: 'Floors and Walkways',
    description: 'Check for slip, trip and fall hazards, clean and dry surfaces',
    is_mandatory: true,
  },
  {
    id: '2',
    category: 'General Areas',
    item_name: 'Stairs, Ladders and Platforms',
    description: 'Inspect handrails, non-slip surfaces, structural integrity',
    is_mandatory: true,
  },
  {
    id: '3',
    category: 'General Areas',
    item_name: 'Lighting',
    description: 'Adequate lighting levels, working bulbs, emergency lighting',
    is_mandatory: true,
  },
  {
    id: '4',
    category: 'Electrical',
    item_name: 'Electrical Cords and Equipment',
    description: 'Check for damage, proper earthing, RCD protection',
    is_mandatory: true,
  },
  {
    id: '5',
    category: 'Housekeeping',
    item_name: 'Rubbish and Waste',
    description: 'Proper disposal, clear walkways, appropriate containers',
    is_mandatory: true,
  },
  {
    id: '6',
    category: 'Work Areas',
    item_name: 'Benches and Work Surfaces',
    description: 'Clean, organised, ergonomically appropriate',
    is_mandatory: true,
  },
  {
    id: '7',
    category: 'Chemical Safety',
    item_name: 'Hazardous Substances',
    description: 'Proper storage, labelling, SDS availability, ventilation',
    is_mandatory: true,
  },
  {
    id: '8',
    category: 'Emergency',
    item_name: 'First Aid Kits',
    description: 'Contents current, accessible, trained personnel available',
    is_mandatory: true,
  },
  {
    id: '9',
    category: 'Emergency',
    item_name: 'Fire Extinguishers',
    description: 'Current testing, accessible, appropriate type for area',
    is_mandatory: true,
  },
];

const WorkplaceInspectionForm: React.FC<WorkplaceInspectionFormProps> = ({ 
  inspection, 
  open, 
  onClose 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspectionResults, setInspectionResults] = useState<Record<string, any>>({});
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [selectedItemForHazard, setSelectedItemForHazard] = useState<string | null>(null);

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: inspection || {
      inspection_date: todayLocalYMD(),
      site_area: '',
      notes: '',
    },
  });

  useEffect(() => {
    // Initialize inspection results for all items
    const initialResults: Record<string, any> = {};
    mockInspectionItems.forEach(item => {
      initialResults[item.id] = {
        status: 'Compliant',
        notes: '',
        photo_urls: [],
        hazard_raised: false,
      };
    });
    setInspectionResults(initialResults);
  }, []);

  const updateInspectionResult = (itemId: string, field: string, value: any) => {
    setInspectionResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleRaiseHazard = (itemId: string) => {
    setSelectedItemForHazard(itemId);
    setShowHazardForm(true);
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Compliant':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Non-Compliant':
        return <X className="h-4 w-4 text-red-600" />;
      case 'Requires Action':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const getOverallStatus = () => {
    const results = Object.values(inspectionResults);
    if (results.some(r => r.status === 'Non-Compliant')) return 'Non-Compliant';
    if (results.some(r => r.status === 'Requires Action')) return 'Requires Action';
    return 'Compliant';
  };

  const onSubmit = async (data: InspectionFormData) => {
    setIsSubmitting(true);
    try {
      const inspectionData = {
        ...data,
        inspector_id: user?.id,
        overall_status: getOverallStatus(),
        results: inspectionResults,
      };
      
      console.log('Submitting inspection:', inspectionData);
      
      toast({
        title: "Inspection Saved",
        description: "The workplace inspection has been successfully saved.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save inspection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedItems = mockInspectionItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof mockInspectionItems>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {inspection ? 'Edit Workplace Inspection' : 'New Workplace Inspection'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Inspection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inspection_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspection Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="site_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site/Area *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Building, Warehouse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Overall inspection notes and observations"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Inspection Checklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Inspection Checklist</CardTitle>
                  <Badge className={getStatusColor(getOverallStatus())}>
                    Overall Status: {getOverallStatus()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="font-medium text-lg mb-4">{category}</h4>
                    <div className="space-y-4">
                      {items.map((item) => {
                        const result = inspectionResults[item.id] || {};
                        
                        return (
                          <Card key={item.id} className="border-l-4 border-l-primary/20">
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h5 className="font-medium">{item.item_name}</h5>
                                      {item.is_mandatory && (
                                        <Badge variant="secondary" className="text-xs">
                                          Mandatory
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Status *
                                    </label>
                                    <Select
                                      value={result.status}
                                      onValueChange={(value) => 
                                        updateInspectionResult(item.id, 'status', value)
                                      }
                                    >
                                      <SelectTrigger>
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon(result.status)}
                                          <SelectValue />
                                        </div>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Compliant">
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            Compliant
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="Non-Compliant">
                                          <div className="flex items-center gap-2">
                                            <X className="h-4 w-4 text-red-600" />
                                            Non-Compliant
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="Not Applicable">
                                          <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-gray-600" />
                                            Not Applicable
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="Requires Action">
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                                            Requires Action
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="text-sm font-medium mb-2 block">
                                      Notes
                                    </label>
                                    <Textarea
                                      placeholder="Specific observations or issues"
                                      value={result.notes}
                                      onChange={(e) => 
                                        updateInspectionResult(item.id, 'notes', e.target.value)
                                      }
                                      className="resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // TODO: Implement photo upload
                                      toast({
                                        title: "Photo Upload",
                                        description: "Photo upload functionality to be implemented",
                                      });
                                    }}
                                  >
                                    <Camera className="h-4 w-4 mr-1" />
                                    Add Photo
                                  </Button>

                                  {(result.status === 'Non-Compliant' || result.status === 'Requires Action') && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRaiseHazard(item.id)}
                                    >
                                      <AlertTriangle className="h-4 w-4 mr-1" />
                                      Raise Hazard
                                    </Button>
                                  )}

                                  {result.hazard_raised && (
                                    <Badge className="bg-orange-100 text-orange-800">
                                      Hazard Raised
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    {category !== Object.keys(groupedItems)[Object.keys(groupedItems).length - 1] && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Inspection'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkplaceInspectionForm;