import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Phone,
  Linkedin,
  Calendar,
  ArrowRight,
  CheckSquare,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { useProspectActivities, useLogProspectActivity } from "@/hooks/crm/useProspectActivities";
import { useAuth } from "@/context/AuthContext";
import { PROSPECT_ACTIVITY_TYPES } from "@/lib/crm/constants";
import type { ProspectActivityType } from "@/lib/crm/types";

const ACTIVITY_ICONS: Record<ProspectActivityType, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  call: Phone,
  linkedin: Linkedin,
  meeting_request: Calendar,
  stage_change: ArrowRight,
  follow_up_task: CheckSquare,
};

const QUICK_LOG_TYPES: ProspectActivityType[] = ["email", "call", "linkedin", "meeting_request"];

interface ProspectActivityLogProps {
  prospectId: string;
  readOnly?: boolean;
}

export function ProspectActivityLog({ prospectId, readOnly }: ProspectActivityLogProps) {
  const { user } = useAuth();
  const { data: activities = [], isLoading } = useProspectActivities(prospectId);
  const logActivity = useLogProspectActivity();

  const [activeType, setActiveType] = useState<ProspectActivityType | null>(null);
  const [summary, setSummary] = useState("");

  const handleLog = () => {
    if (!activeType || !summary.trim() || !user) return;

    logActivity.mutate(
      {
        prospect_id: prospectId,
        activity_type: activeType,
        activity_summary: summary.trim(),
        activity_at: new Date().toISOString(),
        owner_id: user.id,
        created_by: user.id,
      },
      {
        onSuccess: () => {
          setSummary("");
          setActiveType(null);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Activity</h4>

      {/* Quick log buttons */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {QUICK_LOG_TYPES.map((type) => {
              const Icon = ACTIVITY_ICONS[type];
              const info = PROSPECT_ACTIVITY_TYPES[type];
              return (
                <Button
                  key={type}
                  variant={activeType === type ? "default" : "outline"}
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setActiveType(activeType === type ? null : type)}
                >
                  <Icon className="h-3 w-3" />
                  {info.label}
                </Button>
              );
            })}
          </div>

          {activeType && (
            <div className="space-y-2">
              <Textarea
                placeholder={`Describe the ${PROSPECT_ACTIVITY_TYPES[activeType].label.toLowerCase()}...`}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7"
                  onClick={handleLog}
                  disabled={!summary.trim() || logActivity.isPending}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Log
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => { setActiveType(null); setSummary(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activities logged yet.</p>
      ) : (
        <ol className="space-y-3">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type] ?? Mail;
            const info = PROSPECT_ACTIVITY_TYPES[activity.activity_type];
            return (
              <li key={activity.id} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-muted">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{info.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.activity_at), "dd MMM yyyy, h:mm a")}
                    </span>
                    {activity.owner?.full_name && (
                      <span className="text-xs text-muted-foreground">· {activity.owner.full_name}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{activity.activity_summary}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
