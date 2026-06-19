import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Building2, X, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCustomers } from "@/lib/customer-service";
import AddEditCustomerDialog from "./AddEditCustomerDialog";

interface CustomerSelectorProps {
  selectedCustomerId: string | null | undefined;
  onSelectCustomer: (customerId: string | null) => void;
  disabled?: boolean;
  containerClassName?: string;
  preventClose?: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomerId,
  onSelectCustomer,
  disabled = false,
  containerClassName = "",
  preventClose = false,
}) => {
  const [open, setOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleInteraction = (e: React.MouseEvent) => {
    if (preventClose) e.stopPropagation();
  };

  return (
    <div className={containerClassName} onClick={handleInteraction}>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || isLoading}
              className="flex-1 justify-between font-normal"
            >
              <span className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                {selectedCustomer
                  ? <span className="truncate">
                      {selectedCustomer.name}
                      {selectedCustomer.company ? ` (${selectedCustomer.company})` : ""}
                    </span>
                  : <span className="text-muted-foreground">Select a customer...</span>
                }
              </span>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search customers..." />
              <CommandList>
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  {selectedCustomerId && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => { onSelectCustomer(null); setOpen(false); }}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear selection
                    </CommandItem>
                  )}
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={`${customer.name} ${customer.company ?? ""} ${customer.email ?? ""}`}
                      onSelect={() => {
                        onSelectCustomer(customer.id === selectedCustomerId ? null : customer.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("h-4 w-4 mr-2 shrink-0", customer.id === selectedCustomerId ? "opacity-100" : "opacity-0")}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{customer.name}</span>
                        {customer.company && (
                          <span className="text-xs text-muted-foreground truncate">{customer.company}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={(e) => {
            if (preventClose) e.stopPropagation();
            setIsAddCustomerOpen(true);
          }}
          disabled={disabled}
          title="Add new customer"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>

      <AddEditCustomerDialog
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        existingCustomer={null}
      />
    </div>
  );
};

export default CustomerSelector;
