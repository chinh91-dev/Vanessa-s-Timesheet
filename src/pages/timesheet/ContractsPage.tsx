import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, AlertTriangle, CheckCircle, Search, FileText, Filter, RefreshCw, Eye } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Contract, fetchContracts } from "@/lib/contract-service";

import ContractList from "@/components/contracts/ContractList";
import AddEditContractDialog from "@/components/contracts/AddEditContractDialog";
import DeleteContractDialog from "@/components/contracts/DeleteContractDialog";
import ContractFilters from "@/components/contracts/ContractFilters";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ImportButton from "@/components/common/ImportButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContractRealtime } from "@/hooks/useContractRealtime";

const ContractsPage = () => {
  const { user, userRole } = useAuth();
  
  // Enable real-time updates for contracts
  useContractRealtime();
  const [isAddContractOpen, setIsAddContractOpen] = useState(false);
  const [isDeleteContractOpen, setIsDeleteContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  
  const [filters, setFilters] = useState({
    status: 'all',
    customerId: 'all',
    searchTerm: '',
    isActive: undefined as boolean | undefined
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Determine if user has read-only access (manager role)
  const isReadOnly = userRole === "manager";
  const isAdmin = userRole === "admin";

  const { 
    data: contracts = [], 
    isLoading, 
    refetch,
    error
  } = useQuery({
    queryKey: ["contracts", filters, activeTab],
    queryFn: () => {
      // Determine status filter based on active tab
      const baseFilters: Parameters<typeof fetchContracts>[0] = {
        customerId: filters.customerId === 'all' ? '' : filters.customerId,
        searchTerm: filters.searchTerm,
        isActive: filters.isActive
      };

      if (activeTab === 'active') {
        // Active tab: show active and pending_renewal contracts
        baseFilters.statusIn = ['active', 'pending_renewal'];
      } else {
        // Archived tab: show expired and renewed contracts
        baseFilters.statusIn = ['expired', 'renewed'];
      }

      // Apply additional status filter if set (only on active tab)
      if (activeTab === 'active' && filters.status !== 'all') {
        baseFilters.statusIn = [filters.status];
      }

      return fetchContracts(baseFilters);
    },
    enabled: !!user
  });


  useEffect(() => {
    if (error) {
      console.error("Error fetching contracts:", error);
      toast({
        title: "Error fetching contracts",
        description: "There was an issue loading your contracts. Please try again.",
        variant: "destructive",
      });
    }
  }, [error]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ 
      ...prev, 
      searchTerm: e.target.value 
    }));
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      customerId: 'all',
      searchTerm: '',
      isActive: undefined
    });
  };

  const handleEditContract = (contract: Contract) => {
    if (isReadOnly) {
      toast({
        title: "View Only Access",
        description: "You have read-only access to contracts. Contact an administrator to make changes.",
        variant: "destructive",
      });
      return;
    }
    setEditingContract(contract);
    setIsAddContractOpen(true);
  };
  
  const handleDeleteClick = (contract: Contract) => {
    if (isReadOnly) {
      toast({
        title: "View Only Access",
        description: "You have read-only access to contracts. Contact an administrator to make changes.",
        variant: "destructive",
      });
      return;
    }
    setContractToDelete(contract);
    setIsDeleteContractOpen(true);
  };

  const closeAddEditDialog = () => {
    setIsAddContractOpen(false);
    setEditingContract(null);
    refetch();
  };

  const closeDeleteDialog = () => {
    setIsDeleteContractOpen(false);
    setContractToDelete(null);
    refetch();
  };

  const calculateContractStats = () => {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(c => c.is_active).length;
    const pendingRenewal = contracts.filter(c => c.status === 'pending_renewal').length;
    const expiredContracts = contracts.filter(c => c.status === 'expired').length;
    
    return {
      totalContracts,
      activeContracts,
      pendingRenewal,
      expiredContracts
    };
  };

  const stats = calculateContractStats();

  return (
    <div className="container mx-auto">
      {/* View-only access alert for managers */}
      {isReadOnly && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Eye className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You have <strong>view-only access</strong> to contracts. You can browse all contract information, status, and assignments, but cannot create, edit, or delete contracts. Contact an administrator if you need to make changes.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'archived')} className="w-full">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Contracts {isReadOnly && <span className="text-muted-foreground text-base font-normal">(View Only)</span>}
            </h1>
            <p className="text-gray-600">
              {isReadOnly ? "Browse and monitor service contracts" : "Manage and monitor service contracts"}
            </p>
          </div>
          
          {/* Action buttons - hide for read-only users */}
          {!isReadOnly && activeTab === 'active' && (
            <div className="flex gap-2">
              <ImportButton
                entityType="contracts"
                onImportComplete={refetch}
                variant="outline"
              />
              
              <Button 
                onClick={() => refetch()}
                variant="outline"
                title="Refresh contracts"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button 
                onClick={() => setIsAddContractOpen(true)} 
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Add Contract
              </Button>
            </div>
          )}

          {/* Refresh button for archived tab or read-only users */}
          {(isReadOnly || activeTab === 'archived') && (
            <Button 
              onClick={() => refetch()}
              variant="outline"
              title="Refresh contracts"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        <TabsList className="mb-6">
          <TabsTrigger value="active">Active Contracts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <div className="mb-6 flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>

          {activeTab === 'active' && (
            <Button 
              variant="outline" 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {isFilterOpen ? "Hide Filters" : "Show Filters"}
            </Button>
          )}

          {(filters.status !== 'all' || filters.customerId !== 'all' || filters.isActive !== undefined) && (
            <Button 
              variant="ghost" 
              onClick={resetFilters}
              className="text-sm"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {isFilterOpen && activeTab === 'active' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <ContractFilters 
                filters={filters} 
                onFilterChange={handleFilterChange}
              />
            </CardContent>
          </Card>
        )}

        {!isLoading && contracts.length > 0 && activeTab === 'active' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Contract Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activeContracts} / {stats.totalContracts}
              </div>
              <p className="text-sm text-muted-foreground">
                Active contracts
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-orange-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-orange-500 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Pending Renewal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {stats.pendingRenewal}
              </div>
              <p className="text-sm text-muted-foreground">
                Contracts expiring within 3 months
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-red-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-red-500">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats.expiredContracts}
              </div>
              <p className="text-sm text-muted-foreground">
                Expired contracts
              </p>
            </CardContent>
          </Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{activeTab === 'active' ? 'Active Contracts' : 'Archived Contracts'}</CardTitle>
              <CardDescription>
                {activeTab === 'active' 
                  ? (isReadOnly ? "Browse active and pending renewal contracts" : "Manage active and pending renewal contracts")
                  : "View expired contracts"
                }
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {contracts.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Clock className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : contracts.length > 0 ? (
            <ContractList 
              contracts={contracts} 
              onEdit={handleEditContract} 
              onDelete={handleDeleteClick}
              readOnly={isReadOnly}
            />
          ) : (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">
                {activeTab === 'active' ? 'No active contracts found' : 'No expired contracts found'}
              </p>
              {!isReadOnly && activeTab === 'active' && (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddContractOpen(true)}
                  >
                    Add Your First Contract
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    or <ImportButton entityType="contracts" onImportComplete={refetch} variant="ghost" size="sm" />
                  </div>
                </div>
              )}
            </div>
          )}
          </CardContent>
        </Card>
      </Tabs>
      
      {/* Only show dialogs for admin users */}
      {!isReadOnly && (
        <>
          <AddEditContractDialog 
            isOpen={isAddContractOpen} 
            onClose={closeAddEditDialog} 
            existingContract={editingContract}
          />
          
          {contractToDelete && (
            <DeleteContractDialog 
              isOpen={isDeleteContractOpen}
              onClose={closeDeleteDialog}
              contract={contractToDelete}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ContractsPage;
