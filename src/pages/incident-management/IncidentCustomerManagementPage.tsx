import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building2 } from "lucide-react";
import CustomerAccountManagement from "@/components/incidents/CustomerAccountManagement";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
}

const IncidentCustomerManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useRealtimeSubscription({ table: 'customer_logins', queryKeys: ['customer-logins'], channelName: 'rt-customer-logins' });

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Customer[];
    },
  });

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Account Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage customer user accounts and invitations for incident management access
          </p>
        </div>
      </div>

      {!selectedCustomer ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Customer
            </CardTitle>
            <CardDescription>
              Choose a customer to manage their user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No customers found matching your search." : "No customers available."}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{customer.name}</h3>
                          {customer.company && (
                            <p className="text-sm text-muted-foreground">{customer.company}</p>
                          )}
                          {customer.email && (
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          Manage Accounts
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedCustomer(null)}
            >
              ← Back to Customer List
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{selectedCustomer.name}</h2>
              {selectedCustomer.company && (
                <p className="text-muted-foreground">{selectedCustomer.company}</p>
              )}
            </div>
          </div>

          <CustomerAccountManagement 
            companyId={selectedCustomer.id}
            companyName={selectedCustomer.name}
          />
        </div>
      )}
    </div>
  );
};

export default IncidentCustomerManagementPage;