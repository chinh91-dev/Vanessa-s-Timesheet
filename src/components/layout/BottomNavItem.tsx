import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavItemData {
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
  requiresAuth?: boolean;
}

interface BottomNavItemProps {
  item: BottomNavItemData;
  isActive: boolean;
  onClick: () => void;
  activeColor?: string;
}

export const BottomNavItem: React.FC<BottomNavItemProps> = ({
  item,
  isActive,
  onClick,
  activeColor,
}) => {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      style={isActive && activeColor ? { color: activeColor } : undefined}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 h-14 flex-1 min-w-[64px]",
        "transition-all duration-200 active:scale-95",
        isActive && !activeColor && "text-primary",
        !isActive && "text-muted-foreground"
      )}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="relative">
        <Icon
          className={cn(
            "h-6 w-6 transition-transform duration-200",
            isActive && "scale-110"
          )}
        />
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium transition-opacity",
          isActive && "font-semibold"
        )}
      >
        {item.label}
      </span>
    </button>
  );
};

export default BottomNavItem;
