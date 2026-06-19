import { useState } from "react";
import { Check, ChevronsUpDown, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAccounts } from "@/hooks/crm/useAccounts";
import { useDevice } from "@/context/DeviceContext";

interface AccountOption {
  id: string;
  name: string;
  industry?: string | null;
  segment?: string | null;
  hasCustomer?: boolean;
}

interface AccountComboboxProps {
  value: string | null;
  onChange: (accountId: string | null, accountName: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AccountCombobox({
  value,
  onChange,
  disabled = false,
  placeholder = "Select existing account...",
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { data: accounts = [], isLoading } = useAccounts();
  const { isIOS, isMobile } = useDevice();

  // Transform accounts to options
  const options: AccountOption[] = accounts.map(account => ({
    id: account.id,
    name: account.name,
    industry: account.industry,
    segment: account.segment,
    hasCustomer: !!account.converted_to_customer_id,
  }));

  // Filter by search
  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase()) ||
    opt.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedAccount = options.find(opt => opt.id === value);

  const handleSelect = (accountId: string) => {
    const account = options.find(opt => opt.id === accountId);
    if (account) {
      onChange(account.id, account.name);
    }
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null, null);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={isIOS || isMobile}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedAccount ? (
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedAccount.name}</span>
              {selectedAccount.hasCustomer && (
                <Badge variant="secondary" className="ml-1 shrink-0">
                  <Users className="h-3 w-3 mr-1" />
                  Customer
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] p-0 pointer-events-auto" 
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search accounts..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[50vh] overflow-y-auto touch-pan-y overscroll-contain pointer-events-auto [-webkit-overflow-scrolling:touch]">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading accounts...
              </div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>No accounts found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {value && (
                  <CommandItem onSelect={handleClear} className="text-muted-foreground">
                    <span>Clear selection</span>
                  </CommandItem>
                )}
                {filteredOptions.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={account.id}
                    onSelect={() => handleSelect(account.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === account.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{account.name}</span>
                        {account.hasCustomer && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            Customer
                          </Badge>
                        )}
                      </div>
                      {(account.industry || account.segment) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {[account.industry, account.segment].filter(Boolean).join(" • ")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
