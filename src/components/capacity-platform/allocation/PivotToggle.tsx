// ============================================================================
// PivotToggle — segmented control for grid orientation
// ----------------------------------------------------------------------------
// "By Person" rows = active profiles, cols = Mon-Fri.
// "By Customer" rows = distinct customers, cols = Mon-Fri (customer pivot v0).
// Phase 10 will add a (customer, person, day) drilldown variant.
// ============================================================================

import { Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AllocationPivot = "person" | "customer";

export interface PivotToggleProps {
  value: AllocationPivot;
  onChange: (next: AllocationPivot) => void;
}

const PivotToggle = ({ value, onChange }: PivotToggleProps) => {
  const opt = (
    key: AllocationPivot,
    label: string,
    Icon: typeof Users
  ) => (
    <Button
      key={key}
      variant={value === key ? "default" : "outline"}
      size="sm"
      onClick={() => onChange(key)}
      aria-pressed={value === key}
      className="gap-1"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );

  return (
    <div
      className="inline-flex gap-1"
      role="group"
      aria-label="Pivot orientation"
    >
      {opt("person", "By Person", Users)}
      {opt("customer", "By Customer", Building2)}
    </div>
  );
};

export default PivotToggle;
