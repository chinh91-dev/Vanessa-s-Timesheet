import React, { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useAccounts } from "@/hooks/crm/useAccounts";
import { AccountDialog } from "./AccountDialog";

interface AccountSelectorProps {
  selectedAccountId: string | null | undefined;
  onSelectAccount: (accountId: string | null) => void;
  disabled?: boolean;
  containerClassName?: string;
  preventClose?: boolean;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  selectedAccountId,
  onSelectAccount,
  disabled = false,
  containerClassName = "space-y-2",
  preventClose = false
}) => {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const { data: accounts = [], isLoading } = useAccounts();

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (preventClose) {
      e.stopPropagation();
    }
  };

  return (
    <div 
      className={containerClassName}
      onClick={handleInteraction}
      onKeyDown={handleInteraction}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={selectedAccountId || "none"}
            onValueChange={(value) => {
              const accountId = value === "none" ? null : value;
              onSelectAccount(accountId);
            }}
            disabled={disabled || isLoading}
          >
            <SelectTrigger 
              className="w-full"
              onClick={handleInteraction}
            >
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent onClick={handleInteraction}>
              <SelectItem value="none">None</SelectItem>
              {accounts.filter(a => a.is_active).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={(e) => {
            if (preventClose) e.stopPropagation();
            setIsAddAccountOpen(true);
          }}
          disabled={disabled}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
        </Button>
      </div>

      <AccountDialog
        open={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
      />
    </div>
  );
};
