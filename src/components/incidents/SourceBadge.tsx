import { Badge } from "@/components/ui/badge";
import { Globe, Mail, MessageSquare, Code } from "lucide-react";
import type { IncidentSource } from "@/types/incident-types";
import { cn } from "@/lib/utils";

interface SourceBadgeProps {
  source?: IncidentSource;
  className?: string;
}

const sourceConfig: Record<IncidentSource, { icon: React.ElementType; label: string; className: string }> = {
  web: {
    icon: Globe,
    label: "Web",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
  },
  email: {
    icon: Mail,
    label: "Email",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
  },
  sms: {
    icon: MessageSquare,
    label: "SMS",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
  },
  api: {
    icon: Code,
    label: "API",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
  }
};

export function SourceBadge({ source = 'web', className }: SourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.web;
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-medium gap-1",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
