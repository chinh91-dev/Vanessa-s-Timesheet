import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, AlertTriangle } from "lucide-react";
import { format, addWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { usePipelineStages } from "@/hooks/crm/usePipelineStages";
import { useConvertProspectToDeal } from "@/hooks/crm/useConvertProspectToDeal";
import { useAuth } from "@/context/AuthContext";
import type { Prospect } from "@/lib/crm/types";

const convertSchema = z.object({
  dealName: z.string().min(1, "Deal name is required").max(150),
  startStage: z.enum(["qualified", "discovery"]),
  closeDate: z.date({ required_error: "Close date is required" }),
  notes: z.string().optional(),
});

type ConvertFormData = z.infer<typeof convertSchema>;

interface ConvertProspectToDealDialogProps {
  open: boolean;
  onClose: () => void;
  prospect: Prospect;
}

export function ConvertProspectToDealDialog({ open, onClose, prospect }: ConvertProspectToDealDialogProps) {
  const { user } = useAuth();
  const { data: stages = [] } = usePipelineStages();
  const convert = useConvertProspectToDeal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryContact = prospect.prospect_contacts?.find((pc) => pc.is_primary);
  const accountName = prospect.account?.name || "Account";
  const defaultDealName = `${accountName} - ${prospect.name} Opportunity`;

  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      dealName: defaultDealName,
      startStage: "qualified",
      closeDate: addWeeks(new Date(), 4),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        dealName: defaultDealName,
        startStage: "qualified",
        closeDate: addWeeks(new Date(), 4),
        notes: "",
      });
    }
  }, [open, defaultDealName, form]);

  // Already converted guard
  if (prospect.converted_to_deal_id) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Already Converted</DialogTitle>
            <DialogDescription>This prospect has already been converted to a deal.</DialogDescription>
          </DialogHeader>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // No primary contact guard
  if (!primaryContact) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <DialogTitle>Primary Contact Required</DialogTitle>
            </div>
            <DialogDescription>
              A primary contact must be linked to this prospect before converting to a deal. Add and set a primary contact first.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const resolveStageId = (startStage: "qualified" | "discovery") => {
    const activeStages = stages.filter((s) => s.is_active);
    if (startStage === "discovery") {
      const discovery = activeStages.find((s) => s.name.toLowerCase().includes("discovery"));
      if (discovery) return discovery.id;
    }
    // Default: first active stage (Qualified)
    return activeStages[0]?.id || "";
  };

  const onSubmit = async (data: ConvertFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await convert.mutateAsync({
        prospect,
        dealName: data.dealName,
        pipelineStageId: resolveStageId(data.startStage),
        closeDateStr: format(data.closeDate, "yyyy-MM-dd"),
        notes: data.notes,
        userId: user.id,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <DialogTitle>Convert to Deal</DialogTitle>
          </div>
          <DialogDescription>
            Convert <strong>{prospect.name}</strong> into a real sales opportunity.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dealName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start deal in stage *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="qualified" id="stage-qualified" />
                        <Label htmlFor="stage-qualified">Qualified <span className="text-xs text-muted-foreground">(default)</span></Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="discovery" id="stage-discovery" />
                        <Label htmlFor="stage-discovery">Discovery <span className="text-xs text-muted-foreground">(meeting booked)</span></Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closeDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expected Close Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "dd/MM/yyyy") : "Pick a date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Any notes to carry over into the deal..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Carrying over</p>
              <p><strong>Account:</strong> {accountName}</p>
              <p><strong>Primary Contact:</strong> {primaryContact.contact?.contact_name}</p>
              {prospect.source && <p><strong>Source:</strong> {prospect.source}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Converting..." : "Convert to Deal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
