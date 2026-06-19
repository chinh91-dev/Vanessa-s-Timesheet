
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, Edit, Users, Star } from "lucide-react";
import { Customer, fetchCustomerLiaisons } from "@/lib/customer-service";

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDoubleRightClick: (customer: Customer, event: React.MouseEvent) => void;
  onManageLogins?: (customer: Customer) => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ 
  customer, 
  onEdit, 
  onDoubleRightClick,
  onManageLogins
}) => {
  // Fetch liaisons for this customer
  const { data: liaisons = [] } = useQuery({
    queryKey: ["customer-liaisons", customer.id],
    queryFn: () => fetchCustomerLiaisons(customer.id),
    staleTime: 30000, // Cache for 30 seconds
  });

  const primaryLiaison = liaisons.find((l) => l.is_primary);
  const liaisonCount = liaisons.length;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onContextMenu={(e) => onDoubleRightClick(customer, e)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold truncate">
            {customer.name}
          </CardTitle>
          <div className="flex gap-1">
            {onManageLogins && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageLogins(customer)}
                className="flex-shrink-0"
                title="Manage User Logins"
              >
                <Users className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(customer)}
              className="flex-shrink-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Email */}
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {customer.email ? (
            <a 
              href={`mailto:${customer.email}`}
              className="text-primary hover:underline text-sm truncate"
            >
              {customer.email}
            </a>
          ) : (
            <span className="text-muted-foreground text-sm">No email</span>
          )}
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {customer.phone ? (
            <a 
              href={`tel:${customer.phone}`}
              className="text-primary hover:underline text-sm"
            >
              {customer.phone}
            </a>
          ) : (
            <span className="text-muted-foreground text-sm">No phone</span>
          )}
        </div>

        {/* Company */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {customer.company ? (
            <Badge variant="secondary" className="text-xs">
              {customer.company}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">No company</span>
          )}
        </div>

        {/* Liaisons */}
        {liaisonCount > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {primaryLiaison ? (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1 fill-current text-amber-500" />
                  {primaryLiaison.name}
                  {primaryLiaison.title && (
                    <span className="text-muted-foreground ml-1">
                      ({primaryLiaison.title})
                    </span>
                  )}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {liaisonCount} {liaisonCount === 1 ? "Liaison" : "Liaisons"}
                </span>
              )}
              {liaisonCount > 1 && primaryLiaison && (
                <span className="text-xs text-muted-foreground">
                  +{liaisonCount - 1} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
