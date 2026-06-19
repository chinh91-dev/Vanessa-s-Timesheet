import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Settings, ArrowUp, ArrowDown, Edit2, Trophy, X, Pause } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import {
  usePipelineStages,
  useUpdatePipelineStage,
  useReorderPipelineStage,
  useToggleStageActive,
} from "@/hooks/crm/usePipelineStages";
import type { PipelineStage } from "@/lib/crm/types";

const stageFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  default_probability: z
    .number()
    .min(0, "Probability must be at least 0")
    .max(100, "Probability must be at most 100"),
  color: z.string().optional(),
  is_active: z.boolean(),
});

type StageFormValues = z.infer<typeof stageFormSchema>;

const PRESET_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
];

export const PipelineManagementAdmin = () => {
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: stages, isLoading } = usePipelineStages();
  const updateStage = useUpdatePipelineStage();
  const reorderStage = useReorderPipelineStage();
  const toggleActive = useToggleStageActive();

  const form = useForm<StageFormValues>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: {
      name: "",
      default_probability: 0,
      color: "#3b82f6",
      is_active: true,
    },
  });

  const handleEdit = (stage: PipelineStage) => {
    setEditingStage(stage);
    form.reset({
      name: stage.name,
      default_probability: stage.default_probability,
      color: stage.color || "#3b82f6",
      is_active: stage.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (values: StageFormValues) => {
    if (!editingStage) return;

    await updateStage.mutateAsync({
      id: editingStage.id,
      updates: values,
    });

    setIsDialogOpen(false);
    setEditingStage(null);
  };

  const handleReorder = async (stage: PipelineStage, direction: "up" | "down") => {
    await reorderStage.mutateAsync({ id: stage.id, direction });
  };

  const handleToggleActive = async (stage: PipelineStage) => {
    await toggleActive.mutateAsync({
      id: stage.id,
      is_active: !stage.is_active,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading pipeline stages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedStages = [...(stages || [])].sort((a, b) => a.stage_order - b.stage_order);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pipeline Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage pipeline stages, probabilities, and automation rules
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Order</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStages.map((stage, index) => (
                  <TableRow key={stage.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{stage.stage_order}</span>
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => handleReorder(stage, "up")}
                            disabled={index === 0 || stage.is_closed_won || stage.is_closed_lost}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => handleReorder(stage, "down")}
                            disabled={
                              index === sortedStages.length - 1 ||
                              stage.is_closed_won ||
                              stage.is_closed_lost
                            }
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {stage.name}
                          {stage.is_closed_won && (
                            <Badge variant="default" className="bg-green-500">
                              <Trophy className="h-3 w-3 mr-1" />
                              Won
                            </Badge>
                          )}
                          {stage.is_closed_lost && (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Lost
                            </Badge>
                          )}
                          {!stage.is_active && (
                            <Badge variant="secondary">
                              <Pause className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {stage.default_probability}%
                          </span>
                        </div>
                        <Progress
                          value={stage.default_probability}
                          className="h-2"
                          indicatorClassName={
                            stage.is_closed_won
                              ? "bg-green-500"
                              : stage.is_closed_lost
                              ? "bg-red-500"
                              : undefined
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: stage.color || "#3b82f6",
                          color: "white",
                        }}
                      >
                        {stage.color || "#3b82f6"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={stage.is_active}
                        onCheckedChange={() => handleToggleActive(stage)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(stage)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Stage Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pipeline Stage</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Qualified" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="default_probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Probability (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Expected win probability for opportunities in this stage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <Button
                            key={color.value}
                            type="button"
                            variant={field.value === color.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => field.onChange(color.value)}
                            className="w-20"
                            style={{
                              backgroundColor:
                                field.value === color.value ? color.value : undefined,
                              color: field.value === color.value ? "white" : undefined,
                            }}
                          >
                            {color.name}
                          </Button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Stage</FormLabel>
                      <FormDescription>
                        Inactive stages are hidden from pipeline views
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />


              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStage.isPending}>
                  {updateStage.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
