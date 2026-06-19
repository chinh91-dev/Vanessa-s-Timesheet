
import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFilterSheetProps {
    children: React.ReactNode;
    triggerLabel?: string;
    title?: string;
    description?: string;
    onClearFilters?: () => void;
    className?: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    activeFilterCount?: number;
}

const MobileFilterSheet = ({
    children,
    triggerLabel = "Filters",
    title = "Filters",
    description = "Refine your view",
    onClearFilters,
    className,
    isOpen,
    onOpenChange,
    activeFilterCount = 0
}: MobileFilterSheetProps) => {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button variant="outline" className={cn("gap-2", className)}>
                    <Filter className="h-4 w-4" />
                    <span>{triggerLabel}</span>
                    {activeFilterCount > 0 && (
                        <span className="ml-1 rounded-full bg-primary text-primary-foreground w-5 h-5 text-xs flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
                <SheetHeader className="mb-4">
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>

                <div className="space-y-6 pb-20">
                    {children}
                </div>

                <SheetFooter className="absolute bottom-0 left-0 right-0 bg-background border-t p-4 flex-row gap-2 justify-between">
                    {onClearFilters && (
                        <Button variant="outline" onClick={onClearFilters} className="flex-1">
                            Clear All
                        </Button>
                    )}
                    <SheetClose asChild>
                        <Button type="submit" className="flex-1">Show Results</Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default MobileFilterSheet;
