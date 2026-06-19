import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useParams, useNavigate } from "react-router-dom";
import { useService } from "@/hooks/crm/useServices";
import { ArrowLeft, Edit, DollarSign, Calendar, Package, Layers } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/crm/formatting";
import { useState } from "react";
import { ServiceDialog } from "@/components/crm/services/ServiceDialog";

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: service, isLoading } = useService(id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading service details...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Service not found</h2>
          <Button onClick={() => navigate("/crm/services")}>
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200' : 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/services")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{service.name}</h1>
            <p className="text-muted-foreground">Service Details</p>
          </div>
        </div>
        <Button onClick={() => setEditDialogOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(service.is_active)}>
                {service.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>


            {service.category && (
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">{service.category}</p>
                </div>
              </div>
            )}

            {service.sku && (
              <div>
                <p className="text-sm font-medium mb-1">SKU</p>
                <p className="text-sm text-muted-foreground">{service.sku}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {service.billing_types && service.billing_types.length > 0 && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Billing Types</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.billing_types.map((type) => (
                      <Badge key={type} variant="secondary" className="capitalize">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(service.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ServiceDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        service={service}
      />
    </div>
  );
}
