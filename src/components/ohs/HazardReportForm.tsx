import React, { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon } from 'lucide-react';

const hazardReportSchema = z.object({
  // Reporter Information
  employee_reporter_name: z.string().min(1, 'Reporter name is required'),
  employee_reporter_contact: z.string().optional(),
  intake_source: z.enum(['verbal', 'email', 'phone']),
  
  // Location Details
  site_area: z.string().min(1, 'Site/area is required'),
  exact_location: z.string().min(1, 'Exact location is required'),
  
  // Hazard Details
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['Physical', 'Chemical', 'Biological', 'Mechanical-Electrical', 'Psychological']),
  exposure: z.string().optional(),
  
  // Risk Assessment
  likelihood: z.enum(['Very Unlikely', 'Unlikely', 'Possible', 'Likely', 'Very Likely']),
  consequence: z.enum(['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic']),
  
  // Controls
  hierarchy_of_control: z.enum(['Eliminate', 'Substitute', 'Isolate', 'Engineer', 'Administration', 'PPE']),
  control_justification: z.string().min(1, 'Control justification is required'),
  
  // Reasonably Practicable Factors
  rp_likelihood_factor: z.string().optional(),
  rp_degree_of_harm: z.string().optional(),
  rp_knowledge_factor: z.string().optional(),
  rp_available_methods: z.string().optional(),
  rp_cost_factor: z.string().optional(),
  
  // Action Management
  action_owner: z.string().optional(),
  due_date: z.string().optional(),
  consultation_notes: z.string().optional(),
  
  // Residual Risk
  residual_likelihood: z.enum(['Very Unlikely', 'Unlikely', 'Possible', 'Likely', 'Very Likely']).optional(),
  residual_consequence: z.enum(['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic']).optional(),
  review_date: z.string().optional(),
});

type HazardReportFormData = z.infer<typeof hazardReportSchema>;

interface HazardReportFormProps {
  report?: any;
  open: boolean;
  onClose: () => void;
}

const HazardReportForm: React.FC<HazardReportFormProps> = ({ report, open, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HazardReportFormData>({
    resolver: zodResolver(hazardReportSchema),
    defaultValues: report || {
      intake_source: 'verbal',
      category: 'Physical',
      likelihood: 'Possible',
      consequence: 'Minor',
      hierarchy_of_control: 'Eliminate',
    },
  });

  const calculateRiskRating = (likelihood: string, consequence: string) => {
    const likelihoodScores = {
      'Very Unlikely': 1,
      'Unlikely': 2,
      'Possible': 3,
      'Likely': 4,
      'Very Likely': 5,
    };
    
    const consequenceScores = {
      'Insignificant': 1,
      'Minor': 2,
      'Moderate': 3,
      'Major': 4,
      'Catastrophic': 5,
    };
    
    return (likelihoodScores[likelihood] || 3) * (consequenceScores[consequence] || 2);
  };

  const getRiskLevel = (rating: number) => {
    if (rating <= 4) return { level: 'Low', color: 'bg-green-100 text-green-800' };
    if (rating <= 9) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    if (rating <= 16) return { level: 'High', color: 'bg-orange-100 text-orange-800' };
    return { level: 'Extreme', color: 'bg-red-100 text-red-800' };
  };

  const watchedLikelihood = form.watch('likelihood');
  const watchedConsequence = form.watch('consequence');
  const watchedResidualLikelihood = form.watch('residual_likelihood');
  const watchedResidualConsequence = form.watch('residual_consequence');

  const initialRiskRating = calculateRiskRating(watchedLikelihood, watchedConsequence);
  const residualRiskRating = watchedResidualLikelihood && watchedResidualConsequence 
    ? calculateRiskRating(watchedResidualLikelihood, watchedResidualConsequence)
    : null;

  const onSubmit = async (data: HazardReportFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to save hazard report
      console.log('Submitting hazard report:', data);
      
      toast({
        title: "Hazard Report Saved",
        description: "The hazard report has been successfully saved.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save hazard report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {report ? 'Edit Hazard Report' : 'New Hazard Report'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="controls">Controls</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Incident Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employee_reporter_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Reporter Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Employee reporting the hazard" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="employee_reporter_contact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reporter Contact</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone or email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="intake_source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intake Source *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="How was this reported?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="verbal">Verbal Report</SelectItem>
                              <SelectItem value="email">Email Report</SelectItem>
                              <SelectItem value="phone">Phone Report</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="site_area"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site/Area *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Factory Floor, Office Building" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="exact_location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exact Location *</FormLabel>
                            <FormControl>
                              <Input placeholder="Specific location within site/area" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hazard Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief title describing the hazard" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Detailed description of the hazard"
                              className="min-h-20"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hazard Category *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Physical">Physical</SelectItem>
                                <SelectItem value="Chemical">Chemical</SelectItem>
                                <SelectItem value="Biological">Biological</SelectItem>
                                <SelectItem value="Mechanical-Electrical">Mechanical-Electrical</SelectItem>
                                <SelectItem value="Psychological">Psychological</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="exposure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exposure Details</FormLabel>
                            <FormControl>
                              <Input placeholder="Who/what is exposed to this hazard?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assessment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="likelihood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Likelihood *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Very Unlikely">Very Unlikely</SelectItem>
                                <SelectItem value="Unlikely">Unlikely</SelectItem>
                                <SelectItem value="Possible">Possible</SelectItem>
                                <SelectItem value="Likely">Likely</SelectItem>
                                <SelectItem value="Very Likely">Very Likely</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="consequence"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Consequence *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Insignificant">Insignificant</SelectItem>
                                <SelectItem value="Minor">Minor</SelectItem>
                                <SelectItem value="Moderate">Moderate</SelectItem>
                                <SelectItem value="Major">Major</SelectItem>
                                <SelectItem value="Catastrophic">Catastrophic</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Initial Risk Rating:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{initialRiskRating}</span>
                          <Badge className={getRiskLevel(initialRiskRating).color}>
                            {getRiskLevel(initialRiskRating).level}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">Reasonably Practicable Factors</h4>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="rp_likelihood_factor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Likelihood of Hazard Occurring</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Consider frequency of exposure, historical data, etc."
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="rp_degree_of_harm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Degree of Harm</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Potential severity of injury or harm"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="rp_knowledge_factor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State of Knowledge</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Current understanding and available information about the hazard"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="rp_available_methods"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available and Suitable Control Methods</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="What control measures are available and appropriate?"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="rp_cost_factor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost and Effort</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Consider costs versus benefits of control measures"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="controls" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Hierarchy of Control</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="hierarchy_of_control"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Control Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Eliminate">Eliminate (Most Effective)</SelectItem>
                              <SelectItem value="Substitute">Substitute</SelectItem>
                              <SelectItem value="Isolate">Isolate</SelectItem>
                              <SelectItem value="Engineer">Engineering Controls</SelectItem>
                              <SelectItem value="Administration">Administrative Controls</SelectItem>
                              <SelectItem value="PPE">PPE (Least Effective)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="control_justification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Control Justification *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Explain why this control method was chosen and how it will be implemented"
                              className="min-h-24"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">Residual Risk Assessment (After Controls)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="residual_likelihood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Residual Likelihood</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select likelihood after controls" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Very Unlikely">Very Unlikely</SelectItem>
                                  <SelectItem value="Unlikely">Unlikely</SelectItem>
                                  <SelectItem value="Possible">Possible</SelectItem>
                                  <SelectItem value="Likely">Likely</SelectItem>
                                  <SelectItem value="Very Likely">Very Likely</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="residual_consequence"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Residual Consequence</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select consequence after controls" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Insignificant">Insignificant</SelectItem>
                                  <SelectItem value="Minor">Minor</SelectItem>
                                  <SelectItem value="Moderate">Moderate</SelectItem>
                                  <SelectItem value="Major">Major</SelectItem>
                                  <SelectItem value="Catastrophic">Catastrophic</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {residualRiskRating && (
                        <div className="p-4 bg-muted rounded-lg mt-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Residual Risk Rating:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">{residualRiskRating}</span>
                              <Badge className={getRiskLevel(residualRiskRating).color}>
                                {getRiskLevel(residualRiskRating).level}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Action Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="action_owner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Action Owner</FormLabel>
                            <FormControl>
                              <Input placeholder="Person responsible for implementing controls" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="consultation_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consultation Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Record of consultation with workers, safety representatives, etc."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="review_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Review Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Report'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default HazardReportForm;