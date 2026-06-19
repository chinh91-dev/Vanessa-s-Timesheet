import React, { useState, useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Building2, Users, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  type: 'account' | 'contact' | 'deal';
  title: string;
  subtitle?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalSearch = ({ 
  open, 
  onOpenChange
}: GlobalSearchProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Search function with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const searchPattern = `%${searchQuery}%`;

        // Search accounts
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('id, name, industry')
          .or(`name.ilike.${searchPattern},industry.ilike.${searchPattern}`)
          .limit(5);

        if (accountsError) throw accountsError;

        // Search contacts
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('id, contact_name, company_name, email, converted_account:converted_to_account_id(name)')
          .or(`contact_name.ilike.${searchPattern},company_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
          .limit(5);

        if (contactsError) throw contactsError;

        // Search deals
        const { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select('id, name, account:account_id(name)')
          .ilike('name', searchPattern)
          .limit(5);

        if (dealsError) throw dealsError;

        const searchResults: SearchResult[] = [
          ...(accounts || []).map(a => ({
            id: a.id,
            type: 'account' as const,
            title: a.name,
            subtitle: a.industry || undefined,
          })),
          ...(contacts || []).map(c => ({
            id: c.id,
            type: 'contact' as const,
            title: c.contact_name || c.company_name || 'Unknown Contact',
            subtitle: (c.converted_account as any)?.name || c.email || undefined,
          })),
          ...(deals || []).map(d => ({
            id: d.id,
            type: 'deal' as const,
            title: d.name,
            subtitle: (d.account as any)?.name || undefined,
          })),
        ];

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        toast({
          title: "Search error",
          description: "Failed to search. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    setSearchQuery("");
    
    switch (result.type) {
      case 'account':
        navigate(`/crm/accounts/${result.id}`);
        break;
      case 'contact':
        navigate(`/crm/contacts/${result.id}`);
        break;
      case 'deal':
        navigate(`/crm/deals/${result.id}`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'account':
        return <Building2 className="h-4 w-4" />;
      case 'contact':
        return <Users className="h-4 w-4" />;
      case 'deal':
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search accounts, contacts, deals..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {!searchQuery && (
          <CommandEmpty>Type to search accounts, contacts, or deals</CommandEmpty>
        )}

        {searchQuery && results.length === 0 && !loading && (
          <CommandEmpty>No results found for "{searchQuery}"</CommandEmpty>
        )}

        {searchQuery && loading && (
          <CommandEmpty>Searching...</CommandEmpty>
        )}

        {results.length > 0 && (
          <>
            {results.filter(r => r.type === 'account').length > 0 && (
              <CommandGroup heading="Accounts">
                {results.filter(r => r.type === 'account').map(result => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    {getIcon(result.type)}
                    <div className="ml-2">
                      <div className="font-medium">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.filter(r => r.type === 'contact').length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Contacts">
                  {results.filter(r => r.type === 'contact').map(result => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="ml-2">
                        <div className="font-medium">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {results.filter(r => r.type === 'deal').length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Deals">
                  {results.filter(r => r.type === 'deal').map(result => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="ml-2">
                        <div className="font-medium">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;
