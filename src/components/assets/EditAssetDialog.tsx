import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AssetService } from "@/lib/asset-service";
import { AssetGroupService } from "@/lib/asset-group-service";
import type { Asset, AssetType, AssetStatus, AssetGroup } from "@/types/asset-types";
import { toast } from "sonner";
import { DeviceUserCombobox } from "./DeviceUserCombobox";

const editAssetSchema = z.object({
  label: z.string().min(1, "Asset label is required"),
  type_id: z.string().min(1, "Asset type is required"),
  status_id: z.string().min(1, "Status is required"),
  group_id: z.string().min(1, "Group is required"),
  device_user_id: z.string().optional(),
  location: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().optional(),
});

type EditAssetFormData = z.infer<typeof editAssetSchema>;

interface EditAssetDialogProps {
  asset: Asset;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditAssetDialog({ asset, open, onClose, onSuccess }: EditAssetDialogProps) {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<EditAssetFormData>({
    resolver: zodResolver(editAssetSchema),
    defaultValues: {
      label: asset.label || "",
      type_id: asset.type_id || "",
      status_id: asset.status_id || "",
      group_id: asset.group_id || "",
      device_user_id: asset.device_user_id || "",
      location: asset.location || "",
      serial_number: asset.serial_number || "",
      purchase_date: asset.purchase_date || "",
      warranty_expiry: asset.warranty_expiry || "",
      notes: asset.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      loadFormData();
      // Reset form with asset values when dialog opens
      form.reset({
        label: asset.label || "",
        type_id: asset.type_id || "",
        status_id: asset.status_id || "",
        group_id: asset.group_id || "",
        device_user_id: asset.device_user_id || "",
        location: asset.location || "",
        serial_number: asset.serial_number || "",
        purchase_date: asset.purchase_date || "",
        warranty_expiry: asset.warranty_expiry || "",
        notes: asset.notes || "",
      });
    }
  }, [open, asset]);

  const loadFormData = async () => {
    try {
      setDataLoading(true);
      const [types, statuses, groups] = await Promise.all([
        AssetService.getAssetTypes(),
        AssetService.getAssetStatuses(),
        AssetGroupService.getAssetGroups()
      ]);
      
      setAssetTypes(types);
      setAssetStatuses(statuses);
      setAssetGroups(groups);
    } catch (error) {
      console.error('Failed to load form data:', error);
      toast.error('Failed to load form data');
    } finally {
      setDataLoading(false);
    }
  };

  const onSubmit = async (data: EditAssetFormData) => {
    try {
      setLoading(true);

      await AssetService.updateAsset({
        id: asset.id,
        label: data.label,
        type_id: data.type_id,
        status_id: data.status_id,
        group_id: data.group_id,
        device_user_id: data.device_user_id || undefined,
        location: data.location || null,
        serial_number: data.serial_number || null,
        purchase_date: data.purchase_date || null,
        warranty_expiry: data.warranty_expiry || null,
        notes: data.notes || null,
      });
      
      toast.success("Asset updated successfully");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to update asset:', error);
      const errorMessage = error?.message || 'Failed to update asset';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
          <DialogDescription>
            Update the asset details. Required fields are marked with an asterisk.
          </DialogDescription>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Label */}
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Label *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MacBook Pro 2023" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Asset Type */}
                <FormField
                  control={form.control}
                  name="type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetStatuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: status.colour }}
                                />
                                {status.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Asset Group */}
                <FormField
                  control={form.control}
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Group *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: group.color }}
                                />
                                {group.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Assigned To */}
                <FormField
                  control={form.control}
                  name="device_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <DeviceUserCombobox
                          value={field.value}
                          onChange={(val) => field.onChange(val || "")}
                          placeholder="Select or create user..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Melbourne Office" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Serial Number */}
                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter serial number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Purchase Date */}
                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Warranty Expiry */}
                <FormField
                  control={form.control}
                  name="warranty_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional information about this asset..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
