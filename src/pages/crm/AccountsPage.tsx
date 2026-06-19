import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAccounts } from "@/hooks/crm/useAccounts";
import { Building2, Plus, Search, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { canManageAccount } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";
import { AccountDialog } from "@/components/crm/accounts/AccountDialog";

export default function AccountsPage() {
  const { userRole } = useAuth();
  const { data: accounts, isLoading } = useAccounts();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(undefined);

  const filteredAccounts = accounts?.filter((account) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      account.name?.toLowerCase().includes(searchLower) ||
      account.abn?.toLowerCase().includes(searchLower) ||
      account.website?.toLowerCase().includes(searchLower) ||
      account.industry?.toLowerCase().includes(searchLower)
    );
  });

  const canCreate = canManageAccount(userRole);

  return (
    <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">Manage your customer accounts</p>
          </div>
          {canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search accounts by name, ABN, website, or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        ) : filteredAccounts?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No accounts found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? "Try adjusting your search" : "Get started by creating your first account"}
              </p>
              {canCreate && !searchTerm && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAccounts?.map((account) => (
              <Card 
                key={account.id}
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
                onClick={() => {
                  setSelectedAccount(account);
                  setDialogOpen(true);
                }}
              >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{account.name}</CardTitle>
                        {account.industry && (
                          <Badge variant="outline" className="text-xs">
                            {account.industry}
                          </Badge>
                        )}
                      </div>
                      {!account.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {account.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="mr-2 h-4 w-4" />
                        {account.email}
                      </div>
                    )}
                    {account.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="mr-2 h-4 w-4" />
                        {account.phone}
                      </div>
                    )}
                    {(account.suburb || account.state_au) && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {[account.suburb, account.state_au].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {account.segment && (
                      <div className="mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {account.segment}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
            ))}
          </div>
        )}

      <AccountDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedAccount(undefined);
        }}
        account={selectedAccount}
      />
    </div>
  );
}
