import React, { useState } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptic';
import { useDevice } from '@/context/DeviceContext';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'range';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterValues {
  [key: string]: string | string[] | { min?: number; max?: number };
}

interface MobileFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig[];
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  onReset: () => void;
  title?: string;
}

export const MobileFiltersSheet: React.FC<MobileFiltersSheetProps> = ({
  open,
  onOpenChange,
  filters,
  values,
  onApply,
  onReset,
  title = 'Filters',
}) => {
  const { safeAreaBottom } = useDevice();
  const [localValues, setLocalValues] = useState<FilterValues>(values);

  // Count active filters
  const activeFilterCount = Object.entries(localValues).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return value.min !== undefined || value.max !== undefined;
    return value && value !== '';
  }).length;

  const handleValueChange = (filterId: string, value: any) => {
    setLocalValues(prev => ({ ...prev, [filterId]: value }));
  };

  const handleMultiSelectToggle = (filterId: string, optionValue: string) => {
    triggerHaptic('selection');
    const currentValues = (localValues[filterId] as string[]) || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];
    handleValueChange(filterId, newValues);
  };

  const handleApply = () => {
    triggerHaptic('success');
    onApply(localValues);
    onOpenChange(false);
  };

  const handleReset = () => {
    triggerHaptic('medium');
    setLocalValues({});
    onReset();
  };

  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={localValues[filter.id] as string || ''}
            onValueChange={(value) => handleValueChange(filter.id, value)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(option => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = (localValues[filter.id] as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {filter.options?.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleMultiSelectToggle(filter.id, option.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                      "transition-colors duration-200",
                      "active:scale-95",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'text':
        return (
          <Input
            type="text"
            value={localValues[filter.id] as string || ''}
            onChange={(e) => handleValueChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
            className="h-11"
          />
        );

      case 'range':
        const rangeValue = (localValues[filter.id] as { min?: number; max?: number }) || {};
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={rangeValue.min || ''}
              onChange={(e) => handleValueChange(filter.id, {
                ...rangeValue,
                min: e.target.value ? Number(e.target.value) : undefined
              })}
              placeholder="Min"
              className="h-11"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              value={rangeValue.max || ''}
              onChange={(e) => handleValueChange(filter.id, {
                ...rangeValue,
                max: e.target.value ? Number(e.target.value) : undefined
              })}
              placeholder="Max"
              className="h-11"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl flex flex-col"
        style={{ paddingBottom: `${safeAreaBottom}px` }}
      >
        <SheetHeader className="flex-shrink-0">
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle>{title}</SheetTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable Filters */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {filters.map(filter => (
            <div key={filter.id} className="space-y-2">
              <Label className="text-sm font-medium">{filter.label}</Label>
              {renderFilter(filter)}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <SheetFooter className="flex-shrink-0 pt-4 border-t gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={handleApply}
          >
            Apply Filters
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFiltersSheet;
