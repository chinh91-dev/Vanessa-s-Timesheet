// ============================================================================
// WorkRequestStatusBadge — small status badge used in queue + cards
// ============================================================================

import { Badge } from "@/components/ui/badge";
import { WORK_REQUEST_STATUS_META } from "@/lib/capacity-platform/workRequestStatus";
import type { WorkRequestStatus } from "@/lib/capacity-platform/types";

export interface WorkRequestStatusBadgeProps {
  status: WorkRequestStatus;
  className?: string;
}

const WorkRequestStatusBadge = ({
  status,
  className,
}: WorkRequestStatusBadgeProps) => {
  const meta = WORK_REQUEST_STATUS_META[status];
  return (
    <Badge
      variant="outline"
      className={[meta.badgeClass, className ?? ""].join(" ")}
    >
      {meta.label}
    </Badge>
  );
};

export default WorkRequestStatusBadge;
