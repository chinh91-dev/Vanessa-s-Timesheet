import React, { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { Contract } from "@/lib/contract-service";
import { TimeEntryFormValues } from "./schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface ContractSelectorProps {
  control: Control<TimeEntryFormValues>;
  contracts?: Contract[];
}

export const ContractSelector: React.FC<ContractSelectorProps> = ({ control, contracts = [] }) => {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={control}
      name="contract_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-medium">Contract*</FormLabel>
          {contracts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No contracts available. You can only log time to contracts you're assigned to. 
                Please contact your administrator to get assigned to contracts.
              </AlertDescription>
            </Alert>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      "w-full justify-between font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value
                      ? contracts.find((contract) => contract.id === field.value)?.name
                      : "Select a contract"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search contracts..." />
                  <CommandList>
                    <CommandEmpty>No contract found.</CommandEmpty>
                    <CommandGroup>
                      {contracts.map((contract) => (
                        <CommandItem
                          key={contract.id}
                          value={contract.name}
                          onSelect={() => {
                            field.onChange(contract.id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === contract.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {contract.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
