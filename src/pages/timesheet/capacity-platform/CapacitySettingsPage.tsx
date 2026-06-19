// ============================================================================
// CapacitySettingsPage — Phase 8 implementation
// ----------------------------------------------------------------------------
// Admin-only editor for the 5 seeded capacity_settings keys.
// Non-admin users see the AdminGate notice instead.
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminGate from "@/components/capacity-platform/AdminGate";
import SettingsForm from "@/components/capacity-platform/SettingsForm";
import CutOverStatusCard from "@/components/capacity-platform/CutOverStatusCard";

const CapacitySettingsPage = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            FTE basis, RAG thresholds (red / amber), week-start day, default holiday state. Admin only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminGate>
            <SettingsForm />
          </AdminGate>
        </CardContent>
      </Card>

      <AdminGate>
        <CutOverStatusCard />
      </AdminGate>
    </div>
  );
};

export default CapacitySettingsPage;
