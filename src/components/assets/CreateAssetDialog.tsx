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
  FormDescription,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { AssetService } from "@/lib/asset-service";
import { AssetGroupService } from "@/lib/asset-group-service";
import type { AssetType, AssetStatus, AssetGroup, CreateAssetRequest, AssetAttributeDef } from "@/types/asset-types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const createAssetSchema = z.object({
  label: z.string().min(1, "Asset label is required"),
  type_id: z.string().min(1, "Asset type is required"),
  status_id: z.string().min(1, "Status is required"),
  group_id: z.string().optional(),
  device_user_name: z.string().optional(),
  location: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().optional(),
});

type CreateAssetFormData = z.infer<typeof createAssetSchema>;

interface CreateAssetDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultGroupId?: string;
}

export function CreateAssetDialog({ open, onClose, onSuccess, defaultGroupId }: CreateAssetDialogProps) {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<AssetAttributeDef[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<CreateAssetFormData>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      label: "",
      type_id: "",
      status_id: "",
      group_id: defaultGroupId || "",
      device_user_name: "",
      location: "",
      serial_number: "",
      purchase_date: "",
      warranty_expiry: "",
      notes: "",
    },
  });

  // Watch type_id to load attribute definitions
  const selectedTypeId = form.watch('type_id');

  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTypeId) {
      loadAttributeDefinitions(selectedTypeId);
    }
  }, [selectedTypeId]);

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
      
      // Set default status to "In Stock" if available
      const inStockStatus = statuses.find(s => s.name.toLowerCase() === 'in stock');
      if (inStockStatus) {
        form.setValue('status_id', inStockStatus.id);
      }
    } catch (error) {
      console.error('Failed to load form data:', error);
      toast.error('Failed to load form data');
    } finally {
      setDataLoading(false);
    }
  };

  const loadAttributeDefinitions = async (typeId: string) => {
    try {
      const definitions = await AssetService.getAssetAttributeDefinitions(typeId);
      setAttributeDefinitions(definitions);
      
      // Initialize custom attributes with empty values
      const initialAttributes: Record<string, any> = {};
      definitions.forEach(def => {
        initialAttributes[def.id] = '';
      });
      setCustomAttributes(initialAttributes);
    } catch (error) {
      console.error('Failed to load attribute definitions:', error);
      // Don't show error toast here as it's not critical
    }
  };

  const onSubmit = async (data: CreateAssetFormData) => {
    try {
      setLoading(true);

      const groupId = defaultGroupId || data.group_id;
      if (!groupId) {
        toast.error('Asset group is required');
        return;
      }

      // Resolve device_user_id from the typed name
      let deviceUserId: string | undefined;
      const userName = data.device_user_name?.trim();
      if (userName) {
        const { data: existing } = await supabase
          .from("device_users")
          .select("id")
          .ilike("name", userName)
          .limit(1);
        if (existing?.length) {
          deviceUserId = existing[0].id;
        } else {
          const { data: created } = await supabase
            .from("device_users")
            .insert({ name: userName })
            .select("id")
            .single();
          deviceUserId = created?.id;
        }
      }

      // Convert form data to the correct types
      const assetData: CreateAssetRequest = {
        label: data.label,
        type_id: data.type_id,
        status_id: data.status_id,
        group_id: groupId,
        purchase_date: data.purchase_date || undefined,
        warranty_expiry: data.warranty_expiry || undefined,
        device_user_id: deviceUserId,
        location: data.location || undefined,
        serial_number: data.serial_number || undefined,
        notes: data.notes || undefined,
        attributes: customAttributes,
      };

      await AssetService.createAsset(assetData);
      
      toast.success("Asset created successfully");
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to create asset:', error);
      const errorMessage = error?.message || error?.details || error?.error_description || 'Failed to create asset';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      form.reset();
      setCustomAttributes({});
      setAttributeDefinitions([]);
      onClose();
    }
  };

  const handleCustomAttributeChange = (attrId: string, value: any) => {
    setCustomAttributes(prev => ({
      ...prev,
      [attrId]: value
    }));
  };

  const renderCustomAttributeInput = (def: AssetAttributeDef) => {
    const value = customAttributes[def.id] || '';
    
    switch (def.data_type) {
      case 'text':
      case 'url':
        return (
          <Input
            value={value}
            onChange={(e) => handleCustomAttributeChange(def.id, e.target.value)}
            placeholder={`Enter ${def.name.toLowerCase()}`}
            type={def.data_type === 'url' ? 'url' : 'text'}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleCustomAttributeChange(def.id, e.target.value)}
            placeholder="0"
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleCustomAttributeChange(def.id, e.target.value)}
          />
        );
      
      case 'boolean':
        return (
          <select
            value={value}
            onChange={(e) => handleCustomAttributeChange(def.id, e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleCustomAttributeChange(def.id, e.target.value)}
            placeholder={`Enter ${def.name.toLowerCase()}`}
          />
        );
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    // Convert from DD/MM/YYYY to YYYY-MM-DD for input[type="date"]
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateString;
  };

  const formatDateFromInput = (dateString: string) => {
    if (!dateString) return '';
    // Convert from YYYY-MM-DD to DD/MM/YYYY
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Asset</DialogTitle>
          <DialogDescription>
            Add a new asset to your inventory. Required fields are marked with an asterisk.
          </DialogDescription>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading form data...</span>
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
                      <FormDescription>
                        Human-friendly name for the asset
                      </FormDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                {/* Asset Group - Only show if no defaultGroupId */}
                {!defaultGroupId && (
                  <FormField
                    control={form.control}
                    name="group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Group</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No group</SelectItem>
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
                )}

                {/* Assigned To */}
                <FormField
                  control={form.control}
                  name="device_user_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer user name..." {...field} />
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
                        <Input
                          type="date"
                          {...field}
                        />
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
                        <Input
                          type="date"
                          {...field}
                        />
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

                {/* Custom Attributes */}
                {attributeDefinitions.length > 0 && (
                  <div className="space-y-4">
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-4">Custom Attributes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {attributeDefinitions.map((def) => (
                          <div key={def.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium">
                                {def.name}
                                {def.is_required && <span className="text-red-500">*</span>}
                              </Label>
                              {def.is_unique && (
                                <Badge variant="outline" className="text-xs">Unique</Badge>
                              )}
                            </div>
                            {renderCustomAttributeInput(def)}
                            <p className="text-xs text-muted-foreground">
                              Type: {def.data_type}
                              {def.is_required && ' • Required'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Asset
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}