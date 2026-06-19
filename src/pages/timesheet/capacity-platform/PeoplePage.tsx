// ============================================================================
// PeoplePage — Phase 8 implementation
// ----------------------------------------------------------------------------
// Lists all profiles in capacity-relevant view. Click a row to edit the 4
// capacity fields (weekly_hours, on_call_capable, can_lead_onboarding,
// backup_for_id). Identity edits route to /timesheet/team.
// ============================================================================

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";
import { useCapacityProfiles } from "@/hooks/capacity-platform";
import PeopleTable from "@/components/capacity-platform/PeopleTable";

const PeoplePage = () => {
  const profiles = useCapacityProfiles();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const all = profiles.data ?? [];
    const term = search.trim().toLowerCase();
    return all.filter((p) => {
      if (!p.is_active) return false;
      if (!term) return true;
      const hay = `${p.full_name ?? ""} ${p.email ?? ""} ${p.employment_type ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [profiles.data, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>People</CardTitle>
        <CardDescription>
          Capacity-relevant view of profiles. Edit weekly hours, on-call, onboarding-lead, and primary backup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5 grow min-w-[200px]">
            <Label htmlFor="people-search" className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                id="people-search"
                value={search}
                placeholder="Name, email, employment type"
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {profiles.data ? `${filtered.length} active` : ""}
          </div>
        </div>

        {profiles.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading people...
          </div>
        )}
        {profiles.isError && (
          <div className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded px-3 py-2">
            Failed to load profiles: {(profiles.error as Error)?.message ?? "unknown error"}
          </div>
        )}
        {profiles.data && <PeopleTable profiles={filtered} />}
      </CardContent>
    </Card>
  );
};

export default PeoplePage;
