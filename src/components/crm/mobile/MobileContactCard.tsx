import React from 'react';
import { Phone, Mail, Building2, Briefcase, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptic';
import type { Contact } from '@/lib/crm/types';

interface MobileContactCardProps {
  contact: Contact;
  dealCount?: number;
  onClick: () => void;
  onCall?: () => void;
  onEmail?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const MobileContactCard: React.FC<MobileContactCardProps> = ({
  contact,
  dealCount,
  onClick,
  onCall,
  onEmail,
  onEdit,
  onDelete,
  className,
}) => {
  const fullName = contact.contact_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'No Name';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Render category badges
  const renderCategoryBadges = () => {
    if (!contact.categories || contact.categories.length === 0) return null;
    
    const visible = contact.categories.slice(0, 2);
    const remaining = contact.categories.length - 2;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {visible.map((cat) => (
          <Badge
            key={cat.id}
            variant="outline"
            className="text-xs px-1.5 py-0"
            style={{
              borderColor: cat.color,
              backgroundColor: `${cat.color}15`,
            }}
          >
            {cat.name}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            +{remaining}
          </Badge>
        )}
      </div>
    );
  };

  const handleCardClick = () => {
    triggerHaptic('light');
    onClick();
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
    }
    onCall?.();
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
    onEmail?.();
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
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{fullName}</h3>
                  {dealCount && dealCount > 0 && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {dealCount}
                    </Badge>
                  )}
                </div>
                {contact.title && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Briefcase className="h-3 w-3" />
                    <span className="truncate">{contact.title}</span>
                  </div>
                )}
                {contact.company_name && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{contact.company_name}</span>
                  </div>
                )}
                {renderCategoryBadges()}
              </div>

              {/* Actions Menu */}
              {(onEdit || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                        Edit Contact
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
                        Delete Contact
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              {contact.phone && (
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
              {contact.email && (
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileContactCard;
