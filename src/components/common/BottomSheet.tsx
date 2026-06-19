import React from 'react';
import { useDevice } from '@/context/DeviceContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Height of the sheet as percentage of viewport
   * @default 90 (90vh)
   */
  height?: number;
}

/**
 * Responsive bottom sheet component
 * - On mobile: Shows as a slide-up sheet from bottom
 * - On desktop: Falls back to a centered dialog
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  height = 90,
}) => {
  const { isMobile, safeAreaBottom } = useDevice();

  // Desktop: Use Dialog
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("max-w-lg", className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="mt-4 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Use Sheet
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl",
          className
        )}
        style={{
          height: `${height}vh`,
          paddingBottom: `${safeAreaBottom + 16}px`,
        }}
      >
        <SheetHeader className="text-left">
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        {/* Scrollable content */}
        <div
          className="mt-4 overflow-y-auto"
          style={{
            height: `calc(${height}vh - 120px - ${safeAreaBottom}px)`,
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BottomSheet;
