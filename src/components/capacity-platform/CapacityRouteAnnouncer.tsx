// ============================================================================
// CapacityRouteAnnouncer — announces sub-route changes to screen readers
// ----------------------------------------------------------------------------
// Renders a visually-hidden aria-live region that updates when the user
// navigates between capacity-platform sub-routes (Hub / People / Skills /
// Allocation / Work Intake / Forecast / Reports / Settings). Improves the
// SPA navigation experience for users on AT.
// ============================================================================

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_LABELS: Record<string, string> = {
  "/capacity-platform": "Dashboard",
  "/capacity-platform/people": "People",
  "/capacity-platform/skills": "Skills",
  "/capacity-platform/allocation": "Allocation",
  "/capacity-platform/intake": "Work Intake",
  "/capacity-platform/forecast": "Forecast",
  "/capacity-platform/reports": "Reports",
  "/capacity-platform/settings": "Settings",
};

const CapacityRouteAnnouncer = () => {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState<string>("");

  useEffect(() => {
    const label = ROUTE_LABELS[pathname];
    if (label) {
      setAnnouncement(`${label} loaded.`);
    }
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

export default CapacityRouteAnnouncer;
