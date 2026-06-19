
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Common time zones list since Intl.supportedValuesOf is not supported in all environments
const TIME_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
];

interface TimeZoneSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const TimeZoneSelect: React.FC<TimeZoneSelectProps> = ({
  value,
  onValueChange,
  placeholder = "Select timezone"
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TIME_ZONES.map((timeZone) => (
          <SelectItem key={timeZone} value={timeZone}>
            {timeZone}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TimeZoneSelect;
