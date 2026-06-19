import React from 'react';
import { Building2, Phone, Mail, MapPin, ExternalLink, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptic';

interface Account {
  id: string;
  name: string;
  industry?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  status?: 'active' | 'inactive' | 'prospect';
  deal_count?: number;
  total_value?: number;
}

interface MobileAccountCardProps {
  account: Account;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const MobileAccountCard: React.FC<MobileAccountCardProps> = ({
  account,
  onClick,
  onEdit,
  onDelete,
  className,
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'inactive':
        return 'bg-muted text-muted-foreground border-border';
      case 'prospect':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const handleCardClick = () => {
    triggerHaptic('light');
    onClick();
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    if (account.phone) {
      window.location.href = `tel:${account.phone}`;
    }
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    if (account.email) {
      window.location.href = `mailto:${account.email}`;
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200",
        "active:scale-[0.98]",
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 p-2.5 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{account.name}</h3>
                {account.industry && (
                  <p className="text-sm text-muted-foreground">{account.industry}</p>
                )}
              </div>

              {/* Status Badge & Menu */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {account.status && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs capitalize", getStatusColor(account.status))}
                  >
                    {account.status}
                  </Badge>
                )}

                {(onEdit || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={handleMenuClick}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('medium');
                          onEdit();
                        }}>
                          Edit Account
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('heavy');
                            onDelete();
                          }}
                        >
                          Delete Account
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Address Info */}
            {account.address && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{account.address}</span>
              </div>
            )}

            {/* Quick Actions */}
            {(account.phone || account.email) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                {account.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={handleCall}
                  >
                    <Phone className="h-4 w-4 mr-1.5" />
                    Call
                  </Button>
                )}
                {account.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={handleEmail}
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Email
                  </Button>
                )}
              </div>
            )}

            {/* Stats Row */}
            {(account.deal_count !== undefined || account.total_value !== undefined) && (
              <div className="mt-3 pt-3 border-t flex items-center gap-4 text-sm">
                {account.deal_count !== undefined && (
                  <div>
                    <span className="font-medium">{account.deal_count}</span>
                    <span className="text-muted-foreground ml-1">
                      {account.deal_count === 1 ? 'deal' : 'deals'}
                    </span>
                  </div>
                )}
                {account.total_value !== undefined && account.total_value > 0 && (
                  <div>
                    <span className="font-medium text-primary">
                      {formatCurrency(account.total_value)}
                    </span>
                    <span className="text-muted-foreground ml-1">value</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileAccountCard;
