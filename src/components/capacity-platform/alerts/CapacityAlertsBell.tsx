// ============================================================================
// CapacityAlertsBell — header bell + popover listing capacity alerts
// ----------------------------------------------------------------------------
// Mounted in the capacity-platform layout. Counts unread alerts derived by
// useCapacityAlerts. Clicking a row marks it read and navigates to the
// associated deep link.
// ============================================================================

import { useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCapacityAlerts } from "@/hooks/capacity-platform/useCapacityAlerts";
import type { AlertSeverity } from "@/lib/capacity-platform/alerts";

const SEV_CLASS: Record<AlertSeverity, string> = {
  danger: "bg-red-100 text-red-800 border-red-300",
  warn: "bg-amber-100 text-amber-800 border-amber-300",
  info: "bg-blue-100 text-blue-800 border-blue-300",
};

const SEV_LABEL: Record<AlertSeverity, string> = {
  danger: "Red",
  warn: "Warn",
  info: "Info",
};

const CapacityAlertsBell = () => {
  const navigate = useNavigate();
  const {
    alerts,
    unreadAlerts,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
  } = useCapacityAlerts();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Capacity alerts${
            unreadCount > 0 ? ` (${unreadCount} unread)` : ""
          }`}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-600 text-white text-[10px] font-semibold px-1"
              aria-hidden
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div>
            <span className="text-sm font-semibold">Capacity alerts</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {unreadCount} unread · {alerts.length} total
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0}
            onClick={markAllRead}
            className="h-7 px-2 text-xs gap-1"
          >
            <Check className="h-3.5 w-3.5" /> Mark all
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="text-xs text-muted-foreground italic px-3 py-4 text-center">
              Loading alerts…
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-3 py-4 text-center">
              All clear — no capacity alerts.
            </div>
          ) : (
            <ul className="divide-y">
              {alerts.map((a) => {
                const isUnread = unreadAlerts.some((u) => u.id === a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        markRead(a.id);
                        if (a.link) navigate(a.link);
                      }}
                      className={`w-full text-left px-3 py-2.5 hover:bg-accent/50 focus:outline-none focus:bg-accent/60 ${
                        isUnread ? "bg-muted/30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] mt-0.5 ${SEV_CLASS[a.severity]}`}
                        >
                          {SEV_LABEL[a.severity]}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {a.title}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {a.description}
                          </div>
                        </div>
                        {isUnread && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CapacityAlertsBell;
