// ============================================================================
// PersonAuditTab — capacity-scoped audit timeline for a single person
// ============================================================================

import AuditTimelineList from "@/components/capacity-platform/audit/AuditTimelineList";

export interface PersonAuditTabProps {
  personId: string;
}

const PersonAuditTab = ({ personId }: PersonAuditTabProps) => (
  <div className="rounded-md border p-4 space-y-3">
    <div>
      <h3 className="text-base font-semibold">Audit timeline</h3>
      <p className="text-sm text-muted-foreground mt-0.5">
        Capacity-scoped <code>audit_logs</code> entries that reference this
        person (via <code>user_id</code> or <code>details.person_id</code> /{" "}
        <code>details.user_id</code>). Last 200 rows.
      </p>
    </div>
    <AuditTimelineList
      filter={{ subjectUserId: personId, limit: 200 }}
      emptyText="No capacity-platform changes recorded for this person yet."
    />
  </div>
);

export default PersonAuditTab;
