
import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, Users, Building, Search, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Customer, fetchCustomers } from "@/lib/customer-service";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AddEditCustomerDialog from "@/components/customers/AddEditCustomerDialog";
import CustomerList from "@/components/customers/CustomerList";
import ImportButton from "@/components/common/ImportButton";
import { useCustomerRealtime } from "@/hooks/useCustomerRealtime";

const CustomersPage = () => {
  const { user } = useAuth();
  
  // Enable real-time updates for customers
  useCustomerRealtime();
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const lastRightClickTime = useRef<number>(0);
  const lastRightClickedCustomer = useRef<string | null>(null);

  const { 
    data: customers = [], 
    isLoading, 
    refetch,
    error
  } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    enabled: !!user
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error fetching customers",
        description: "There was an issue loading your customers. Please try again.",
        variant: "destructive",
      });
    }
  }, [error]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddCustomerOpen(true);
  };

  const handleDoubleRightClick = (customer: Customer, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent context menu
    
    const currentTime = Date.now();
    const timeDiff = currentTime - lastRightClickTime.current;
    
    // Check if this is a double right-click (within 500ms and same customer)
    if (timeDiff < 500 && lastRightClickedCustomer.current === customer.id) {
      handleEditCustomer(customer);
      lastRightClickTime.current = 0; // Reset to prevent triple clicks
      lastRightClickedCustomer.current = null;
    } else {
      lastRightClickTime.current = currentTime;
      lastRightClickedCustomer.current = customer.id;
    }
  };

  const closeAddEditDialog = () => {
    setIsAddCustomerOpen(false);
    setEditingCustomer(null);
    refetch();
  };

  const calculateStats = () => {
    const totalCustomers = customers.length;
    const withEmail = customers.filter(c => c.email).length;
    const withCompany = customers.filter(c => c.company).length;
    
    return {
      totalCustomers,
      withEmail,
      withCompany
    };
  };

  const stats = calculateStats();

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-600">Manage your customer information</p>
        </div>
        
        <div className="flex gap-2">
          <ImportButton
            entityType="customers"
            onImportComplete={refetch}
            variant="outline"
          />
          
          <Button 
            onClick={() => refetch()}
            variant="outline"
            title="Refresh customers"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={() => setIsAddCustomerOpen(true)} 
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {!isLoading && customers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-sm text-muted-foreground">
                In your database
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">With Email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.withEmail}</div>
              <p className="text-sm text-muted-foreground">
                {Math.round((stats.withEmail / stats.totalCustomers) * 100)}% of total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">With Company</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.withCompany}</div>
              <p className="text-sm text-muted-foreground">
                {Math.round((stats.withCompany / stats.totalCustomers) * 100)}% of total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            {filteredCustomers.length} of {customers.length} customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Clock className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : filteredCustomers.length > 0 ? (
            <CustomerList 
              customers={filteredCustomers}
              onEdit={handleEditCustomer}
              onDoubleRightClick={handleDoubleRightClick}
            />
          ) : customers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No customers found</p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddCustomerOpen(true)}
                >
                  Add Your First Customer
                </Button>
                <div className="text-sm text-muted-foreground">
                  or <ImportButton entityType="customers" onImportComplete={refetch} variant="ghost" size="sm" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No customers match your search</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddEditCustomerDialog 
        isOpen={isAddCustomerOpen} 
        onClose={closeAddEditDialog} 
        existingCustomer={editingCustomer}
      />
    </div>
  );
};

export default CustomersPage;
