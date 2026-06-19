import WorkIntakeView from "@/components/capacity-platform/intake/WorkIntakeView";

const WorkIntakePage = () => (
  <section className="space-y-4">
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">Work Intake</h1>
      <p className="text-sm text-muted-foreground">
        Inbound queue + kanban for REQ-#### work requests. Drag a card between
        columns to change status; double-click anywhere on a card or row to
        edit.
      </p>
    </header>

    <WorkIntakeView />

    <footer className="text-xs text-muted-foreground pt-2">
      Auto-assignment hints land in Phase 12. Status changes are validated
      client-side against the same CHECK as the database (estimated_hours
      required for any non-New / non-Cancelled status).
    </footer>
  </section>
);

export default WorkIntakePage;
