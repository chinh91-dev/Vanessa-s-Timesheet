
import React, { useEffect, useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control, useWatch, useFormContext } from "react-hook-form";
import { TimeEntryFormValues } from "./schema";
import { calculateHoursBetweenTimes, isValidTimeString } from "@/lib/time-calculation-utils";

interface TimeInputProps {
  control: Control<TimeEntryFormValues>;
}

export const TimeInput: React.FC<TimeInputProps> = ({ control }) => {
  const [isCalculated, setIsCalculated] = useState(false);
  const { setValue } = useFormContext<TimeEntryFormValues>();
  
  // Watch for changes in start_time and end_time
  const startTime = useWatch({ control, name: "start_time" });
  const endTime = useWatch({ control, name: "end_time" });
  const hoursLogged = useWatch({ control, name: "hours_logged" });

  // Auto-calculate hours when start and end times change
  useEffect(() => {
    if (startTime && endTime && isValidTimeString(startTime) && isValidTimeString(endTime)) {
      const calculatedHours = calculateHoursBetweenTimes(startTime, endTime);
      
      if (calculatedHours > 0) {
        // Use setValue from react-hook-form to update the hours field
        setValue("hours_logged", calculatedHours);
        setIsCalculated(true);
      }
    } else {
      setIsCalculated(false);
    }
  }, [startTime, endTime, setValue]);

  // Clear calculated flag when user manually changes hours
  useEffect(() => {
    if (isCalculated && hoursLogged !== calculateHoursBetweenTimes(startTime || "", endTime || "")) {
      setIsCalculated(false);
    }
  }, [hoursLogged, startTime, endTime, isCalculated]);

  return (
    <div className="space-y-4 lg:space-y-5">
      <div>
        <FormField
          control={control}
          name="hours_logged"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-fluid-md lg:text-fluid-lg font-medium">
                Time span*
              </FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.25" 
                    {...field} 
                    className="w-20 lg:w-24 text-fluid-base" 
                    onChange={(e) => {
                      field.onChange(e);
                      setIsCalculated(false);
                    }}
                  />
                </FormControl>
                <span className="text-fluid-sm lg:text-fluid-base text-gray-600">hours</span>
              </div>
              {isCalculated && (
                <p className="text-fluid-xs text-green-600 mt-1">
                  ✓ Calculated from start/end times
                </p>
              )}
              <FormMessage className="text-fluid-xs lg:text-fluid-sm" />
            </FormItem>
          )}
        />
      </div>

      {/* Enhanced responsive time inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        <FormField
          control={control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-fluid-sm lg:text-fluid-md font-medium">
                <span className="hidden sm:inline">Start time</span>
                <span className="sm:hidden">Start</span>
              </FormLabel>
              <FormControl>
                <Input 
                  type="time" 
                  {...field} 
                  className="text-fluid-sm lg:text-fluid-base" 
                />
              </FormControl>
              <FormMessage className="text-fluid-xs" />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-fluid-sm lg:text-fluid-md font-medium">
                <span className="hidden sm:inline">End time</span>
                <span className="sm:hidden">End</span>
              </FormLabel>
              <FormControl>
                <Input 
                  type="time" 
                  {...field} 
                  className="text-fluid-sm lg:text-fluid-base" 
                />
              </FormControl>
              <FormMessage className="text-fluid-xs" />
            </FormItem>
          )}
        />
      </div>

      {/* Helper text */}
      <div className="text-fluid-xs text-gray-500">
        <p>Enter hours directly or use start/end times for automatic calculation</p>
      </div>
    </div>
  );
};
