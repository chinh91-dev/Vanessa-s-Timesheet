import { Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityAddonCardProps {
  isActive: boolean;
  isIncluded: boolean;
  addonRate: number;
  onClick: () => void;
}

const SecurityAddonCard = ({ isActive, isIncluded, addonRate, onClick }: SecurityAddonCardProps) => {
  const showCheck = isActive || isIncluded;
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isIncluded}
      className={cn(
        "w-full p-4 rounded-lg border transition-all text-left flex items-start gap-3",
        "focus:outline-none focus:ring-2 focus:ring-green-500/50",
        isIncluded
          ? "bg-green-50 dark:bg-green-950 border-green-500 dark:border-green-600 cursor-default"
          : isActive
            ? "bg-green-50 dark:bg-green-950 border-green-600 shadow-[0_0_10px_rgba(22,163,74,0.2)]"
            : "bg-card border-border hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-300 dark:hover:border-green-700"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
        isIncluded
          ? "bg-green-500 border-green-500"
          : showCheck
            ? "bg-green-600 border-green-600"
            : "border-muted-foreground"
      )}>
        {showCheck && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1">
        <div className={cn(
          "flex items-center gap-2 font-medium",
          isIncluded ? "text-green-700 dark:text-green-300" : "text-foreground"
        )}>
          <Shield className={cn("w-4 h-4", isIncluded ? "text-green-600 dark:text-green-400" : "text-green-600 dark:text-green-400")} />
          {isIncluded ? "Managed security included" : "Add managed security"}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isIncluded 
            ? "24/7 threat monitoring and MDR response is included in this tier"
            : `24/7 threat monitoring and MDR response (+$${addonRate}/user/month)`
          }
        </p>
      </div>
    </button>
  );
};

export default SecurityAddonCard;
