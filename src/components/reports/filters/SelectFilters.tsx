import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportFiltersType } from "@/pages/timesheet/ReportsPage";
import { Project, Contract } from "@/lib/timesheet-service";
import { Customer } from "@/lib/customer-service";
import { User } from "@/lib/user-service";

interface SelectFiltersProps {
  filters: ReportFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<ReportFiltersType>>;
  projects: Project[];
  contracts: Contract[];
  customers: Customer[];
  users: User[];
  actionTypes: string[];
}

export const SelectFilters = ({
  filters,
  setFilters,
  projects,
  contracts,
  customers,
  users,
  actionTypes
}: SelectFiltersProps) => {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const normalizeSelectValue = (value: string | undefined): string | null => {
    if (!value || value === "" || value === "all" || value === "empty") {
      return null;
    }
    return value;
  };

  const getEmployeeDisplayName = (user: User) => {
    return user.employee_id 
      ? `${user.employee_id} - ${user.full_name || "Unknown User"}` 
      : user.full_name || "Unknown User";
  };

  return (
    <>
      {/* Customer Filter */}
      <div className="w-full md:w-auto">
        <label className="text-sm font-medium">Customer</label>
        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={customerOpen}
              className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>span]:line-clamp-1"
            >
              {filters.customerId 
                ? customers.find(c => c.id === filters.customerId)?.name || "All Customers"
                : "All Customers"}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search customers..." />
              <CommandList>
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-customers"
                    onSelect={() => {
                      setFilters(prev => ({ ...prev, customerId: null }));
                      setCustomerOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !filters.customerId ? "opacity-100" : "opacity-0")} />
                    All Customers
                  </CommandItem>
                  {customers?.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.name}
                      onSelect={() => {
                        setFilters(prev => ({ ...prev, customerId: customer.id }));
                        setCustomerOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", filters.customerId === customer.id ? "opacity-100" : "opacity-0")} />
                      {customer.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Project Filter */}
      {filters.includeProject && (
        <div className="w-full md:w-auto">
          <label className="text-sm font-medium">Project</label>
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={projectOpen}
                className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>span]:line-clamp-1"
              >
                {filters.projectId 
                  ? projects.find(p => p.id === filters.projectId)?.name || "All Projects"
                  : "All Projects"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandList>
                  <CommandEmpty>No project found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-projects"
                      onSelect={() => {
                        setFilters(prev => ({ ...prev, projectId: null }));
                        setProjectOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !filters.projectId ? "opacity-100" : "opacity-0")} />
                      All Projects
                    </CommandItem>
                    {projects?.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.name}
                        onSelect={() => {
                          setFilters(prev => ({ ...prev, projectId: project.id }));
                          setProjectOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", filters.projectId === project.id ? "opacity-100" : "opacity-0")} />
                        {project.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Contract Filter */}
      {filters.includeContract && (
        <div className="w-full md:w-auto">
          <label className="text-sm font-medium">Contract</label>
          <Popover open={contractOpen} onOpenChange={setContractOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={contractOpen}
                className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>span]:line-clamp-1"
              >
                {filters.contractId 
                  ? contracts.find(c => c.id === filters.contractId)?.name || "All Contracts"
                  : "All Contracts"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search contracts..." />
                <CommandList>
                  <CommandEmpty>No contract found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-contracts"
                      onSelect={() => {
                        setFilters(prev => ({ ...prev, contractId: null }));
                        setContractOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !filters.contractId ? "opacity-100" : "opacity-0")} />
                      All Contracts
                    </CommandItem>
                    {contracts?.map((contract) => (
                      <CommandItem
                        key={contract.id}
                        value={contract.name}
                        onSelect={() => {
                          setFilters(prev => ({ ...prev, contractId: contract.id }));
                          setContractOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", filters.contractId === contract.id ? "opacity-100" : "opacity-0")} />
                        {contract.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Employee Filter */}
      <div className="w-full md:w-auto">
        <label className="text-sm font-medium">Employee</label>
        <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={employeeOpen}
              className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>span]:line-clamp-1"
            >
              {filters.userId 
                ? getEmployeeDisplayName(users.find(u => u.id === filters.userId) || {} as User)
                : "All Employees"}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search employees..." />
              <CommandList>
                <CommandEmpty>No employee found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-employees"
                    onSelect={() => {
                      setFilters(prev => ({ ...prev, userId: null }));
                      setEmployeeOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !filters.userId ? "opacity-100" : "opacity-0")} />
                    All Employees
                  </CommandItem>
                  {users?.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={getEmployeeDisplayName(user)}
                      onSelect={() => {
                        setFilters(prev => ({ ...prev, userId: user.id }));
                        setEmployeeOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", filters.userId === user.id ? "opacity-100" : "opacity-0")} />
                      {getEmployeeDisplayName(user)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Action Type Filter - keeps basic Select as it has fewer options */}
      {filters.reportType === 'audit' && (
        <div className="w-full md:w-auto">
          <label className="text-sm font-medium">Action Type</label>
          <Select
            value={filters.actionType || ""}
            onValueChange={(value) => setFilters(prev => ({ ...prev, actionType: normalizeSelectValue(value) }))}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              {actionTypes?.map((actionType) => (
                <SelectItem key={actionType} value={actionType}>
                  {actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
};
