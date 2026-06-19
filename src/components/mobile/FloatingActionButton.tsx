import React, { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export interface FloatingActionButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'lg';
}

export function FloatingActionButton({
  icon: Icon,
  onClick,
  label,
  position = 'bottom-right',
  className,
  variant = 'primary',
  size = 'default',
}: FloatingActionButtonProps) {
  const handleClick = () => {
    haptics.medium();
    onClick();
  };

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
  };

  const sizeClasses = {
    'default': 'w-14 h-14',
    'lg': 'w-16 h-16',
  };

  const variantClasses = {
    'primary': 'bg-primary text-primary-foreground hover:bg-primary/90',
    'secondary': 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed z-40 md:hidden",
        "rounded-full shadow-lg",
        "flex items-center justify-center",
        "transition-all duration-200",
        "active:scale-95",
        "hover:shadow-xl",
        "min-h-[44px] min-w-[44px]",
        positionClasses[position],
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-label={label || 'Action button'}
    >
      <Icon className={cn(
        size === 'default' ? 'w-6 h-6' : 'w-7 h-7'
      )} />
    </button>
  );
}

export interface ExtendedFABProps extends Omit<FloatingActionButtonProps, 'label'> {
  label: string;
}

export function ExtendedFAB({
  icon: Icon,
  label,
  onClick,
  position = 'bottom-right',
  className,
  variant = 'primary',
}: ExtendedFABProps) {
  const handleClick = () => {
    haptics.medium();
    onClick();
  };

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
  };

  const variantClasses = {
    'primary': 'bg-primary text-primary-foreground hover:bg-primary/90',
    'secondary': 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed z-40 md:hidden",
        "rounded-full shadow-lg",
        "flex items-center gap-2",
        "px-6 py-4",
        "transition-all duration-200",
        "active:scale-95",
        "hover:shadow-xl",
        "min-h-[44px]",
        positionClasses[position],
        variantClasses[variant],
        className
      )}
      aria-label={label}
    >
      <Icon className="w-6 h-6" />
      <span className="font-medium">{label}</span>
    </button>
  );
}
