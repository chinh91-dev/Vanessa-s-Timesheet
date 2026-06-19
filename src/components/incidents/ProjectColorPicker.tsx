import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const PROJECT_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Green", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Pink", value: "#ec4899" },
  { name: "Slate", value: "#64748b" },
  { name: "Emerald", value: "#10b981" },
];

interface ProjectColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ProjectColorPicker({ 
  value = "#3b82f6", 
  onChange,
  label = "Icon Color"
}: ProjectColorPickerProps) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-2">
        {PROJECT_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={cn(
              "w-8 h-8 rounded-md flex items-center justify-center transition-all",
              "hover:scale-110 hover:ring-2 hover:ring-offset-2 hover:ring-offset-background",
              value === color.value && "ring-2 ring-offset-2 ring-offset-background"
            )}
            style={{ 
              backgroundColor: color.value,
              // @ts-expect-error: CSS custom property for ring color
              "--tw-ring-color": color.value
            }}
            title={color.name}
          >
            {value === color.value && (
              <Check className="h-4 w-4 text-white" />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Choose a background color for the project icon
      </p>
    </div>
  );
}

export { PROJECT_COLORS };
