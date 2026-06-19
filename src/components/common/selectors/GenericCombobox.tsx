/**
 * GenericCombobox Component
 *
 * Reusable combobox/select component that replaces 5+ similar
 * implementations (ProjectSelector, ContractSelector, etc.)
 */

import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ComboboxProps } from '@/types';

/**
 * Generic combobox component with search
 */
export function GenericCombobox<T extends string | number>({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  disabled = false,
  required = false,
  error,
  label,
  className,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (selectedValue: string) => {
    // Find the option by value
    const option = options.find((opt) => String(opt.value) === selectedValue);

    if (option) {
      if (value === option.value) {
        // Deselect if clicking same item
        onValueChange(null);
      } else {
        onValueChange(option.value);
      }
    }

    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className, error && 'border-destructive')}
          disabled={disabled}
        >
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => {
              const isSelected = value === option.value;

              return (
                <CommandItem
                  key={String(option.value)}
                  value={String(option.value)}
                  onSelect={handleSelect}
                  disabled={option.disabled}
                >
                  <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * GenericCombobox wrapped in Form components for use with react-hook-form
 */
export interface FormComboboxProps<T extends string | number> extends ComboboxProps<T> {
  name: string;
  description?: string;
}

export function FormCombobox<T extends string | number>({
  name,
  label,
  description,
  error,
  ...comboboxProps
}: FormComboboxProps<T>) {
  return (
    <FormItem>
      {label && <FormLabel>{label}</FormLabel>}
      <FormControl>
        <GenericCombobox {...comboboxProps} error={error} />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}
