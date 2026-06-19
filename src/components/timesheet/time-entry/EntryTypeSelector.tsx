
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Control } from "react-hook-form";
import { TimeEntryFormValues } from "./schema";

interface EntryTypeSelectorProps {
  control: Control<TimeEntryFormValues>;
}

export const EntryTypeSelector: React.FC<EntryTypeSelectorProps> = ({ control }) => {
  return (
    <FormField
      control={control}
      name="entry_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-medium">Entry Type*</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex flex-row space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="project" />
                <Label htmlFor="project">Project</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contract" id="contract" />
                <Label htmlFor="contract">Contract</Label>
              </div>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
