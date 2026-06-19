import { useState } from "react";
import { Plus, Search, Package, Upload, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices, useDeleteService } from "@/hooks/crm/useServices";
import { useServiceCategories } from "@/hooks/crm/useServiceCategories";
import { canManageServices, canDeleteEntity } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceDialog } from "@/components/crm/services/ServiceDialog";
import { ServiceImportDialog } from "@/components/crm/services/ServiceImportDialog";
import { ServiceCategoryManagement } from "@/components/crm/services/ServiceCategoryManagement";
import { GenericDeleteDialog } from "@/components/common/dialogs";
import type { Service } from "@/lib/crm/types";

export default function ServicesPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  
  const { data: services, isLoading } = useServices();
  const { data: categories } = useServiceCategories();
  const deleteService = useDeleteService();
  const canManage = canManageServices(userRole);

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4 md:p-6 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-8 w-32 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded" />
              </div>
              <div className="h-10 w-32 bg-muted rounded" />
            </div>
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleDeleteClick = () => {
    if (selectedService) {
      setServiceToDelete(selectedService);
      setDialogOpen(false);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async (service: Service) => {
    await deleteService.mutateAsync(service.id);
  };

  const filteredServices = services?.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    const matchesActive = service.is_active;
    return matchesSearch && matchesCategory && matchesActive;
  });

  // Get the color for a category
  const getCategoryColor = (categoryName: string | null | undefined) => {
    if (!categoryName) return null;
    return categories?.find(c => c.name === categoryName)?.color || null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Services</h1>
            <p className="text-muted-foreground mt-1">Manage your service catalogue</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCategoryManagementOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Categories</span>
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button onClick={() => { setSelectedService(undefined); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Service</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {(categories?.length ?? 0) > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color || '#6366f1' }}
                      />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredServices?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No services found</p>
              {canManage && (
                <Button onClick={() => { setSelectedService(undefined); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Service
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map(service => {
              const categoryColor = getCategoryColor(service.category);
              return (
                <Card 
                  key={service.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedService(service); setDialogOpen(true); }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                      </div>
                      {service.category && (
                        <Badge 
                          variant="secondary"
                          style={categoryColor ? {
                            borderColor: categoryColor,
                            backgroundColor: `${categoryColor}20`,
                            color: categoryColor,
                          } : undefined}
                        >
                          {categoryColor && (
                            <div
                              className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
                              style={{ backgroundColor: categoryColor }}
                            />
                          )}
                          {service.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {service.sku && (
                      <p className="text-sm text-muted-foreground">
                        SKU: {service.sku}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ServiceDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedService(undefined); }}
        service={selectedService}
        onDelete={canDeleteEntity(userRole) ? handleDeleteClick : undefined}
      />

      <ServiceImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      />

      <ServiceCategoryManagement
        open={categoryManagementOpen}
        onClose={() => setCategoryManagementOpen(false)}
      />

      {serviceToDelete && (
        <GenericDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entity={serviceToDelete}
          entityName="Service"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
