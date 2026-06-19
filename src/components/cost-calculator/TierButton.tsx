import { cn } from "@/lib/utils";

interface TierButtonProps {
  label: string;
  subLabel?: string | null;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const TierButton = ({ label, subLabel, isActive, onClick, className }: TierButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-4 py-3 rounded-lg border transition-all font-medium text-center",
      "focus:outline-none focus:ring-2 focus:ring-green-500/50",
      isActive
        ? "bg-green-50 dark:bg-green-950 border-green-600 text-green-800 dark:text-green-200 shadow-[0_0_10px_rgba(22,163,74,0.2)]"
        : "bg-card border-border text-muted-foreground hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-300 dark:hover:border-green-700 hover:text-foreground",
      className
    )}
  >
    <span className="block font-semibold">{label}</span>
    {subLabel && <span className="block text-xs opacity-70 mt-0.5">{subLabel}</span>}
  </button>
);

export default TierButton;
