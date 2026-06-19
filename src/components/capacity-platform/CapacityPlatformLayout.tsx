// ============================================================================
// CapacityPlatformLayout — inner chrome for /capacity-platform/*
// ----------------------------------------------------------------------------
// Lives inside CapacityAppLayout (which provides Header + Sidebar).
// Adds:
//   - polite aria-live route announcer
//   - capacity alerts bell (page-local, top-right)
//   - error boundary keyed on pathname (auto-resets on healthy navigation)
//   - id="capacity-content" target for the global skip-link
// Page-section H1 / sub-tabs were removed in the top-level promotion —
// CapacitySidebar carries section navigation now.
// ============================================================================

import { Outlet, useLocation } from "react-router-dom";
import CapacityErrorBoundary from "./CapacityErrorBoundary";
import CapacityRouteAnnouncer from "./CapacityRouteAnnouncer";
import CapacityAlertsBell from "./alerts/CapacityAlertsBell";

const SCOPE_LABELS: Record<string, string> = {
  "/capacity-platform": "Dashboard",
  "/capacity-platform/people": "People",
  "/capacity-platform/skills": "Skills",
  "/capacity-platform/allocation": "Allocation",
  "/capacity-platform/intake": "Work Intake",
  "/capacity-platform/forecast": "Forecast",
  "/capacity-platform/reports": "Reports",
  "/capacity-platform/settings": "Settings",
};

const CapacityPlatformLayout = () => {
  const { pathname } = useLocation();
  const scope = SCOPE_LABELS[pathname] ?? "Capacity Platform";

  return (
    <div className="flex flex-col gap-2">
      <CapacityRouteAnnouncer />
      <div className="flex items-center justify-end">
        <CapacityAlertsBell />
      </div>
      <main id="capacity-content" tabIndex={-1} className="focus:outline-none">
        <CapacityErrorBoundary scope={scope} key={pathname}>
          <Outlet />
        </CapacityErrorBoundary>
      </main>
    </div>
  );
};

export default CapacityPlatformLayout;
