import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchUserContracts } from "@/lib/contract-service";

interface TimesheetContractSelectorProps {
  selectedContractId?: string | null;
  onSelectContract: (contractId: string | null) => void;
  disabled?: boolean;
  containerClassName?: string;
  preventClose?: boolean;
}

const TimesheetContractSelector = ({
  selectedContractId,
  onSelectContract,
  disabled = false,
  containerClassName = "",
  preventClose = false,
}: TimesheetContractSelectorProps) => {
  const [open, setOpen] = useState(false);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', 'user'],
    queryFn: fetchUserContracts,
  });

  const selectedContract = contracts?.find(c => c.id === selectedContractId);

  const handleInteraction = (e: React.MouseEvent) => {
    if (preventClose) e.stopPropagation();
  };

  return (
    <div className={containerClassName} onClick={handleInteraction}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              {selectedContract
                ? <span className="truncate">{selectedContract.name}{selectedContract.customer_name ? ` — ${selectedContract.customer_name}` : ""}</span>
                : <span className="text-muted-foreground">Select contract...</span>
              }
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search contracts..." />
            <CommandList>
              <CommandEmpty>No contracts found.</CommandEmpty>
              <CommandGroup>
                {selectedContractId && (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => { onSelectContract(null); setOpen(false); }}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear selection
                  </CommandItem>
                )}
                {contracts?.map((contract) => (
                  <CommandItem
                    key={contract.id}
                    value={`${contract.name} ${contract.customer_name ?? ""} ${contract.description ?? ""}`}
                    onSelect={() => {
                      onSelectContract(contract.id === selectedContractId ? null : contract.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("h-4 w-4 mr-2 shrink-0", contract.id === selectedContractId ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{contract.name}</span>
                      {contract.customer_name && (
                        <span className="text-xs text-muted-foreground truncate">{contract.customer_name}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimesheetContractSelector;
