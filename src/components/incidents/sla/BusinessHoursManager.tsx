import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Edit, Trash2 } from "lucide-react";
import { EnhancedSlaService, type BusinessHours } from "@/lib/enhanced-sla-service";
import { useToast } from "@/hooks/use-toast";

const slaService = new EnhancedSlaService();

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [`${hour}:00`, `${hour}:30`];
}).flat();

interface BusinessHoursFormData {
  name: string;
  monday_start: string;
  monday_end: string;
  tuesday_start: string;
  tuesday_end: string;
  wednesday_start: string;
  wednesday_end: string;
  thursday_start: string;
  thursday_end: string;
  friday_start: string;
  friday_end: string;
  saturday_start: string;
  saturday_end: string;
  sunday_start: string;
  sunday_end: string;
  timezone: string;
  is_default: boolean;
}

const defaultFormData: BusinessHoursFormData = {
  name: "",
  monday_start: "08:00",
  monday_end: "18:00",
  tuesday_start: "08:00",
  tuesday_end: "18:00",
  wednesday_start: "08:00",
  wednesday_end: "18:00",
  thursday_start: "08:00",
  thursday_end: "18:00",
  friday_start: "08:00",
  friday_end: "18:00",
  saturday_start: "",
  saturday_end: "",
  sunday_start: "",
  sunday_end: "",
  timezone: "UTC",
  is_default: false,
};

const timezones = [
  "UTC", "EST", "CST", "MST", "PST", "GMT", "CET", "JST", "AEST"
];

export function BusinessHoursManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHours, setEditingHours] = useState<BusinessHours | null>(null);
  const [formData, setFormData] = useState<BusinessHoursFormData>(defaultFormData);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businessHours, isLoading } = useQuery({
    queryKey: ['business-hours'],
    queryFn: () => slaService.getBusinessHours(true)
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<BusinessHours, 'id' | 'created_at' | 'updated_at'>) => 
      slaService.createBusinessHours(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Business hours created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating business hours", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BusinessHours> }) => 
      slaService.updateBusinessHours(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      setIsDialogOpen(false);
      setEditingHours(null);
      setFormData(defaultFormData);
      toast({ title: "Business hours updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating business hours", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingHours) {
      updateMutation.mutate({ id: editingHours.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // PostgreSQL returns time as "HH:MM:SS" — strip seconds so it matches the "HH:MM" select options
  const toHHMM = (t?: string) => (t ? t.slice(0, 5) : "");

  const handleEdit = (hours: BusinessHours) => {
    setEditingHours(hours);
    setFormData({
      name: hours.name,
      monday_start: toHHMM(hours.monday_start),
      monday_end: toHHMM(hours.monday_end),
      tuesday_start: toHHMM(hours.tuesday_start),
      tuesday_end: toHHMM(hours.tuesday_end),
      wednesday_start: toHHMM(hours.wednesday_start),
      wednesday_end: toHHMM(hours.wednesday_end),
      thursday_start: toHHMM(hours.thursday_start),
      thursday_end: toHHMM(hours.thursday_end),
      friday_start: toHHMM(hours.friday_start),
      friday_end: toHHMM(hours.friday_end),
      saturday_start: toHHMM(hours.saturday_start),
      saturday_end: toHHMM(hours.saturday_end),
      sunday_start: toHHMM(hours.sunday_start),
      sunday_end: toHHMM(hours.sunday_end),
      timezone: hours.timezone,
      is_default: hours.is_default,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingHours(null);
  };

  const renderTimeInputs = (day: string) => {
    const startKey = `${day}_start` as keyof BusinessHoursFormData;
    const endKey = `${day}_end` as keyof BusinessHoursFormData;
    
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Start</Label>
          <Select
            value={formData[startKey] as string}
            onValueChange={(value) => setFormData(prev => ({ ...prev, [startKey]: value }))}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Start time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No hours</SelectItem>
              {timeOptions.map(time => (
                <SelectItem key={time} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">End</Label>
          <Select
            value={formData[endKey] as string}
            onValueChange={(value) => setFormData(prev => ({ ...prev, [endKey]: value }))}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="End time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No hours</SelectItem>
              {timeOptions.map(time => (
                <SelectItem key={time} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div>Loading business hours...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Business Hours</h2>
          <p className="text-sm text-muted-foreground">
            Configure business hours for SLA calculations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Business Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingHours ? "Edit Business Hours" : "Create Business Hours"}
              </DialogTitle>
              <DialogDescription>
                Define when your support team is available for SLA calculations
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Weekly Schedule</Label>
                <div className="grid gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium">{day}</div>
                      {renderTimeInputs(day.toLowerCase())}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="is-default">Set as default business hours</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingHours ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {businessHours?.map((hours) => (
          <Card key={hours.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <CardTitle className="text-lg">{hours.name}</CardTitle>
                  {hours.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(hours)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { day: 'Monday', start: hours.monday_start, end: hours.monday_end },
                  { day: 'Tuesday', start: hours.tuesday_start, end: hours.tuesday_end },
                  { day: 'Wednesday', start: hours.wednesday_start, end: hours.wednesday_end },
                  { day: 'Thursday', start: hours.thursday_start, end: hours.thursday_end },
                  { day: 'Friday', start: hours.friday_start, end: hours.friday_end },
                  { day: 'Saturday', start: hours.saturday_start, end: hours.saturday_end },
                  { day: 'Sunday', start: hours.sunday_start, end: hours.sunday_end }
                ].map(({ day, start, end }) => (
                  <div key={day} className="flex justify-between">
                    <span className="font-medium">{day}:</span>
                    <span className="text-muted-foreground">
                      {start && end ? `${start} - ${end}` : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Timezone: {hours.timezone}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}