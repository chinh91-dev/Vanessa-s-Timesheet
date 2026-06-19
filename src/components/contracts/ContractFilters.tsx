
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchCustomers } from "@/lib/customer-service";

interface FiltersProps {
  filters: {
    status: string;
    customerId: string;
    searchTerm: string;
    isActive?: boolean;
  };
  onFilterChange: (newFilters: Partial<FiltersProps["filters"]>) => void;
}

const ContractFilters: React.FC<FiltersProps> = ({ filters, onFilterChange }) => {
  // Fetch customers for filtering
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Contract Status Filter */}
      <div className="space-y-2">
        <Label>Contract Status</Label>
        <RadioGroup 
          value={filters.status} 
          onValueChange={(value) => onFilterChange({ status: value })}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="status-all" />
            <Label htmlFor="status-all" className="cursor-pointer">All Statuses</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="active" id="status-active" />
            <Label htmlFor="status-active" className="cursor-pointer">Active</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pending_renewal" id="status-renewal" />
            <Label htmlFor="status-renewal" className="cursor-pointer">Pending Renewal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="expired" id="status-expired" />
            <Label htmlFor="status-expired" className="cursor-pointer">Expired</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="renewed" id="status-renewed" />
            <Label htmlFor="status-renewed" className="cursor-pointer">Renewed</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Customer Filter */}
      <div className="space-y-2">
        <Label>Customer</Label>
        <Select 
          value={filters.customerId} 
          onValueChange={(value) => onFilterChange({ customerId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Status Filter */}
      <div className="space-y-2">
        <Label>Active Status</Label>
        <RadioGroup 
          value={filters.isActive === undefined ? "all" : filters.isActive ? "active" : "inactive"}
          onValueChange={(value) => {
            const isActiveMap: Record<string, boolean | undefined> = {
              all: undefined,
              active: true,
              inactive: false
            };
            onFilterChange({ isActive: isActiveMap[value] });
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="active-all" />
            <Label htmlFor="active-all" className="cursor-pointer">All</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="active" id="active-true" />
            <Label htmlFor="active-true" className="cursor-pointer">Active Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="inactive" id="active-false" />
            <Label htmlFor="active-false" className="cursor-pointer">Inactive Only</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default ContractFilters;
