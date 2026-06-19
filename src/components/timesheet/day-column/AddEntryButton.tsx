
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddEntryButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const AddEntryButton: React.FC<AddEntryButtonProps> = ({ 
  onClick, 
  disabled = false,
  className 
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full border-dashed hover:bg-primary/5 hover:border-primary/30 transition-colors",
        "flex items-center justify-center gap-2 text-muted-foreground hover:text-primary",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:border-dashed hover:text-muted-foreground",
        className
      )}
    >
      <Plus className="h-3 w-3" />
      Add Time
    </Button>
  );
};

export default AddEntryButton;
