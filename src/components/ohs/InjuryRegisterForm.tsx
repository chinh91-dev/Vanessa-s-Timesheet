import React, { useState, useEffect } from 'react';
import { todayLocalYMD } from '@/lib/date-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createInjuryRegister, updateInjuryRegister, InjuryRegister } from '@/lib/ohs-service';

interface InjuryRegisterFormProps {
  injury?: InjuryRegister;
  open: boolean;
  onClose: () => void;
}

const InjuryRegisterForm: React.FC<InjuryRegisterFormProps> = ({ injury, open, onClose }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    incident_date: '',
    incident_time: '',
    is_am_pm: 'AM',
    location: '',
    injured_person_name: '',
    injured_person_contact: '',
    injury_description: '',
    body_parts_affected: '',
    injury_severity: 'First Aid',
    equipment_involved: false,
    equipment_details: '',
    witnesses_present: false,
    witness_names: '',
    witness_contacts: '',
    immediate_action_taken: '',
    first_aid_provided: false,
    first_aid_provider: '',
    medical_treatment_required: false,
    medical_provider: '',
    emergency_services_called: false,
    entry_maker_name: '',
    entry_maker_position: '',
    entry_maker_date: todayLocalYMD(),
    entry_maker_signature: '',
    manager_investigation: '',
    contributing_factors: '',
    controls_implemented: '',
    manager_name: '',
    manager_date: '',
    manager_signature: '',
    employer_confirmation: '',
    employer_date: '',
    employer_signature: '',
    follow_up_required: false,
    follow_up_date: '',
    follow_up_notes: '',
    status: 'Open'
  });

  useEffect(() => {
    if (injury) {
      setFormData({
        incident_date: injury.incident_date || '',
        incident_time: injury.incident_time || '',
        is_am_pm: injury.is_am_pm || 'AM',
        location: injury.location || '',
        injured_person_name: injury.injured_person_name || '',
        injured_person_contact: injury.injured_person_contact || '',
        injury_description: injury.injury_description || '',
        body_parts_affected: injury.body_parts_affected || '',
        injury_severity: injury.injury_severity || 'First Aid',
        equipment_involved: injury.equipment_involved || false,
        equipment_details: injury.equipment_details || '',
        witnesses_present: injury.witnesses_present || false,
        witness_names: injury.witness_names || '',
        witness_contacts: injury.witness_contacts || '',
        immediate_action_taken: injury.immediate_action_taken || '',
        first_aid_provided: injury.first_aid_provided || false,
        first_aid_provider: injury.first_aid_provider || '',
        medical_treatment_required: injury.medical_treatment_required || false,
        medical_provider: injury.medical_provider || '',
        emergency_services_called: injury.emergency_services_called || false,
        entry_maker_name: injury.entry_maker_name || '',
        entry_maker_position: injury.entry_maker_position || '',
        entry_maker_date: injury.entry_maker_date || todayLocalYMD(),
        entry_maker_signature: injury.entry_maker_signature || '',
        manager_investigation: injury.manager_investigation || '',
        contributing_factors: injury.contributing_factors || '',
        controls_implemented: injury.controls_implemented || '',
        manager_name: injury.manager_name || '',
        manager_date: injury.manager_date || '',
        manager_signature: injury.manager_signature || '',
        employer_confirmation: injury.employer_confirmation || '',
        employer_date: injury.employer_date || '',
        employer_signature: injury.employer_signature || '',
        follow_up_required: injury.follow_up_required || false,
        follow_up_date: injury.follow_up_date || '',
        follow_up_notes: injury.follow_up_notes || '',
        status: injury.status || 'Open'
      });
    }
  }, [injury]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (injury) {
        await updateInjuryRegister(injury.id, formData);
        toast({
          title: "Injury Report Updated",
          description: "The injury report has been successfully updated.",
        });
      } else {
        await createInjuryRegister(formData);
        toast({
          title: "Injury Report Created",
          description: "The injury report has been successfully created.",
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save injury report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {injury ? 'Edit Injury Report' : 'Register of Injuries - New Entry'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-6">
          {/* Section 1: Incident Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="incident_date">Date of Incident *</Label>
                  <Input
                    id="incident_date"
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => updateField('incident_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="incident_time">Time of Incident *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="incident_time"
                      type="time"
                      value={formData.incident_time}
                      onChange={(e) => updateField('incident_time', e.target.value)}
                      className="flex-1"
                      required
                    />
                    <Select value={formData.is_am_pm} onValueChange={(value) => updateField('is_am_pm', value)}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="Specific location where incident occurred"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Injured Person Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Injured Person Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="injured_person_name">Name of Injured Person *</Label>
                  <Input
                    id="injured_person_name"
                    value={formData.injured_person_name}
                    onChange={(e) => updateField('injured_person_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="injured_person_contact">Contact Details</Label>
                  <Input
                    id="injured_person_contact"
                    value={formData.injured_person_contact}
                    onChange={(e) => updateField('injured_person_contact', e.target.value)}
                    placeholder="Phone number or email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="injury_description">Description of Injury *</Label>
                <Textarea
                  id="injury_description"
                  value={formData.injury_description}
                  onChange={(e) => updateField('injury_description', e.target.value)}
                  placeholder="Detailed description of the injury and how it occurred"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="body_parts_affected">Body Parts Affected *</Label>
                  <Input
                    id="body_parts_affected"
                    value={formData.body_parts_affected}
                    onChange={(e) => updateField('body_parts_affected', e.target.value)}
                    placeholder="e.g., Left hand, back, etc."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="injury_severity">Injury Severity *</Label>
                  <Select value={formData.injury_severity} onValueChange={(value) => updateField('injury_severity', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Aid">First Aid</SelectItem>
                      <SelectItem value="Medical Treatment">Medical Treatment</SelectItem>
                      <SelectItem value="Lost Time">Lost Time</SelectItem>
                      <SelectItem value="Permanent Disability">Permanent Disability</SelectItem>
                      <SelectItem value="Fatality">Fatality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Incident Circumstances */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Incident Circumstances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="equipment_involved"
                  checked={formData.equipment_involved}
                  onCheckedChange={(checked) => updateField('equipment_involved', checked)}
                />
                <Label htmlFor="equipment_involved">Equipment/Machinery Involved</Label>
              </div>
              {formData.equipment_involved && (
                <div>
                  <Label htmlFor="equipment_details">Equipment Details</Label>
                  <Textarea
                    id="equipment_details"
                    value={formData.equipment_details}
                    onChange={(e) => updateField('equipment_details', e.target.value)}
                    placeholder="Describe the equipment involved"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="witnesses_present"
                  checked={formData.witnesses_present}
                  onCheckedChange={(checked) => updateField('witnesses_present', checked)}
                />
                <Label htmlFor="witnesses_present">Witnesses Present</Label>
              </div>
              
              {formData.witnesses_present && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="witness_names">Witness Names</Label>
                    <Textarea
                      id="witness_names"
                      value={formData.witness_names}
                      onChange={(e) => updateField('witness_names', e.target.value)}
                      placeholder="Names of witnesses"
                    />
                  </div>
                  <div>
                    <Label htmlFor="witness_contacts">Witness Contact Details</Label>
                    <Textarea
                      id="witness_contacts"
                      value={formData.witness_contacts}
                      onChange={(e) => updateField('witness_contacts', e.target.value)}
                      placeholder="Contact details of witnesses"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="immediate_action_taken">Immediate Action Taken</Label>
                <Textarea
                  id="immediate_action_taken"
                  value={formData.immediate_action_taken}
                  onChange={(e) => updateField('immediate_action_taken', e.target.value)}
                  placeholder="Describe immediate actions taken after the incident"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Medical Treatment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Medical Treatment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="first_aid_provided"
                    checked={formData.first_aid_provided}
                    onCheckedChange={(checked) => updateField('first_aid_provided', checked)}
                  />
                  <Label htmlFor="first_aid_provided">First Aid Provided</Label>
                </div>
                
                {formData.first_aid_provided && (
                  <div>
                    <Label htmlFor="first_aid_provider">First Aid Provider</Label>
                    <Input
                      id="first_aid_provider"
                      value={formData.first_aid_provider}
                      onChange={(e) => updateField('first_aid_provider', e.target.value)}
                      placeholder="Name of person who provided first aid"
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="medical_treatment_required"
                    checked={formData.medical_treatment_required}
                    onCheckedChange={(checked) => updateField('medical_treatment_required', checked)}
                  />
                  <Label htmlFor="medical_treatment_required">Medical Treatment Required</Label>
                </div>
                
                {formData.medical_treatment_required && (
                  <div>
                    <Label htmlFor="medical_provider">Medical Provider</Label>
                    <Input
                      id="medical_provider"
                      value={formData.medical_provider}
                      onChange={(e) => updateField('medical_provider', e.target.value)}
                      placeholder="Hospital, clinic, or medical professional"
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emergency_services_called"
                    checked={formData.emergency_services_called}
                    onCheckedChange={(checked) => updateField('emergency_services_called', checked)}
                  />
                  <Label htmlFor="emergency_services_called">Emergency Services Called</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Entry Maker Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Entry Maker Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="entry_maker_name">Name *</Label>
                  <Input
                    id="entry_maker_name"
                    value={formData.entry_maker_name}
                    onChange={(e) => updateField('entry_maker_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="entry_maker_position">Position *</Label>
                  <Input
                    id="entry_maker_position"
                    value={formData.entry_maker_position}
                    onChange={(e) => updateField('entry_maker_position', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="entry_maker_date">Date *</Label>
                  <Input
                    id="entry_maker_date"
                    type="date"
                    value={formData.entry_maker_date}
                    onChange={(e) => updateField('entry_maker_date', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="entry_maker_signature">Signature</Label>
                <Input
                  id="entry_maker_signature"
                  value={formData.entry_maker_signature}
                  onChange={(e) => updateField('entry_maker_signature', e.target.value)}
                  placeholder="Digital signature or typed name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Manager Investigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">6. Manager Investigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manager_investigation">Investigation Details</Label>
                <Textarea
                  id="manager_investigation"
                  value={formData.manager_investigation}
                  onChange={(e) => updateField('manager_investigation', e.target.value)}
                  placeholder="Manager's investigation findings"
                />
              </div>
              <div>
                <Label htmlFor="contributing_factors">Contributing Factors</Label>
                <Textarea
                  id="contributing_factors"
                  value={formData.contributing_factors}
                  onChange={(e) => updateField('contributing_factors', e.target.value)}
                  placeholder="Factors that contributed to the incident"
                />
              </div>
              <div>
                <Label htmlFor="controls_implemented">Controls Implemented</Label>
                <Textarea
                  id="controls_implemented"
                  value={formData.controls_implemented}
                  onChange={(e) => updateField('controls_implemented', e.target.value)}
                  placeholder="Safety controls implemented to prevent recurrence"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manager_name">Manager Name</Label>
                  <Input
                    id="manager_name"
                    value={formData.manager_name}
                    onChange={(e) => updateField('manager_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="manager_date">Manager Date</Label>
                  <Input
                    id="manager_date"
                    type="date"
                    value={formData.manager_date}
                    onChange={(e) => updateField('manager_date', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Follow-up Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">7. Follow-up Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow_up_required"
                  checked={formData.follow_up_required}
                  onCheckedChange={(checked) => updateField('follow_up_required', checked)}
                />
                <Label htmlFor="follow_up_required">Follow-up Required</Label>
              </div>
              
              {formData.follow_up_required && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="follow_up_date">Follow-up Date</Label>
                    <Input
                      id="follow_up_date"
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => updateField('follow_up_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="follow_up_notes">Follow-up Notes</Label>
                    <Textarea
                      id="follow_up_notes"
                      value={formData.follow_up_notes}
                      onChange={(e) => updateField('follow_up_notes', e.target.value)}
                      placeholder="Details of follow-up actions required"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Separator />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InjuryRegisterForm;