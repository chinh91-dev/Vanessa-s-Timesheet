import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PROSPECT_STAGES } from "@/lib/crm/constants";
import type { ProspectStage } from "@/lib/crm/types";

interface ProspectStageSelectProps {
  value: ProspectStage;
  onChange: (stage: ProspectStage) => void;
  disabled?: boolean;
}

export function ProspectStageSelect({ value, onChange, disabled }: ProspectStageSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ProspectStage)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue>
          <StageBadge stage={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(PROSPECT_STAGES) as ProspectStage[]).map((stage) => {
          const info = PROSPECT_STAGES[stage];
          return (
            <SelectItem key={stage} value={stage}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-2">
                    <StageBadge stage={stage} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">{info.description}</p>
                </TooltipContent>
              </Tooltip>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function StageBadge({ stage }: { stage: ProspectStage }) {
  const info = PROSPECT_STAGES[stage];
  return (
    <Badge
      style={{ backgroundColor: info.color, color: "white", borderColor: "transparent" }}
      className="text-xs font-medium"
    >
      {info.label}
    </Badge>
  );
}
