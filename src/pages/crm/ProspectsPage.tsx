import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, Plus, Search, AlertTriangle, LayoutList, Kanban } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useProspects } from "@/hooks/crm/useProspects";
import { useProspectRealtime } from "@/hooks/crm/useProspectRealtime";
import { canManageProspect } from "@/lib/crm/permissions";
import { PROSPECT_STAGES, PROSPECT_STALE_DAYS } from "@/lib/crm/constants";
import { ProspectDialog } from "@/components/crm/prospects/ProspectDialog";
import { ProspectDetailPanel } from "@/components/crm/prospects/ProspectDetailPanel";
import { ProspectCard } from "@/components/crm/prospects/ProspectCard";
import { ProspectBoard } from "@/components/crm/prospects/ProspectBoard";
import { StageBadge } from "@/components/crm/prospects/ProspectStageSelect";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Prospect, ProspectStage } from "@/lib/crm/types";

type SortOption = "newest" | "oldest" | "name_asc" | "next_action_due";
type ViewMode = "list" | "kanban";

const STAGE_FILTER_OPTIONS: Array<{ value: "all" | ProspectStage; label: string }> = [
  { value: "all", label: "All" },
  ...(Object.keys(PROSPECT_STAGES) as ProspectStage[]).map((s) => ({
    value: s,
    label: PROSPECT_STAGES[s].label,
  })),
];

export default function ProspectsPage() {
  const { userRole } = useAuth();
  const isMobile = useIsMobile();
  useProspectRealtime();
  const { data: prospects = [], isLoading } = useProspects();

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | ProspectStage>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewMode>("kanban");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const filtered = useMemo(() => {
    let list = prospects;

    if (stageFilter !== "all") {
      list = list.filter((p) => p.stage === stageFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.account?.name?.toLowerCase().includes(term) ||
          p.owner?.full_name?.toLowerCase().includes(term)
      );
    }

    switch (sortBy) {
      case "oldest":
        return [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "name_asc":
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case "next_action_due":
        return [...list].sort((a, b) => {
          if (!a.next_action_due_date) return 1;
          if (!b.next_action_due_date) return -1;
          return new Date(a.next_action_due_date).getTime() - new Date(b.next_action_due_date).getTime();
        });
      case "newest":
      default:
        return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [prospects, stageFilter, searchTerm, sortBy]);

  // Stage counts for filter tabs
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prospects.length };
    for (const p of prospects) {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
    }
    return counts;
  }, [prospects]);

  const isStale = (p: Prospect) =>
    p.last_activity_at &&
    !p.converted_to_deal_id &&
    p.stage !== "disqualified" &&
    differenceInDays(new Date(), new Date(p.last_activity_at)) >= PROSPECT_STALE_DAYS;

  return (
    <div className="flex flex-col h-full">
      {/* Header + Controls */}
      <div className="border-b p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Prospects</h1>
            <p className="text-muted-foreground mt-1">Manage and track your sales prospects</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle (desktop only) */}
            {!isMobile && (
              <div className="flex items-center border rounded-md overflow-hidden">
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                    view === "list"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <LayoutList className="h-4 w-4" />
                  List
                </button>
                <button
                  onClick={() => setView("kanban")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                    view === "kanban"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Kanban className="h-4 w-4" />
                  Kanban
                </button>
              </div>
            )}
            {canManageProspect(userRole) && (
              <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New Prospect
              </Button>
            )}
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prospects or accounts..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {view === "list" && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="next_action_due">Next Action Due</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stage filter tabs — hidden in kanban since stages are the columns */}
        {view === "list" && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {STAGE_FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStageFilter(value)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                  stageFilter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {label}
                {stageCounts[value] != null && (
                  <span className="ml-1 opacity-70">{stageCounts[value]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kanban view */}
      {!isMobile && view === "kanban" && (
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex gap-4 p-4 md:p-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-[300px] min-w-[300px] flex-shrink-0 space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <ProspectBoard
              prospects={filtered}
              onProspectClick={setSelectedProspect}
            />
          )}
        </div>
      )}

      {/* List/card content */}
      {(isMobile || view === "list") && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Target className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
              <p className="font-medium">No prospects found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm || stageFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Create your first prospect to start tracking outreach."}
              </p>
              {canManageProspect(userRole) && !searchTerm && stageFilter === "all" && (
                <Button className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Prospect
                </Button>
              )}
            </div>
          ) : isMobile ? (
            /* Mobile card view */
            <div className="space-y-3">
              {filtered.map((prospect) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  onClick={() => setSelectedProspect(prospect)}
                />
              ))}
            </div>
          ) : (
            /* Desktop table view */
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Next Action</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((prospect) => {
                    const primaryContact = prospect.prospect_contacts?.find((pc) => pc.is_primary);
                    const stale = isStale(prospect);
                    return (
                      <TableRow
                        key={prospect.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedProspect(prospect)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {stale && (
                              <span title={`No activity in ${PROSPECT_STALE_DAYS}+ days`}><AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /></span>
                            )}
                            <span className="font-medium text-sm line-clamp-1">{prospect.name}</span>
                            {prospect.converted_to_deal_id && (
                              <Badge variant="secondary" className="text-xs shrink-0">Converted</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prospect.account?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {primaryContact?.contact?.contact_name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StageBadge stage={prospect.stage} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prospect.owner?.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {prospect.source?.replace(/_/g, " ") ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">
                          {prospect.next_action ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {prospect.next_action_due_date
                            ? format(new Date(prospect.next_action_due_date), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {prospect.last_activity_at
                            ? format(new Date(prospect.last_activity_at), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(prospect.updated_at), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <ProspectDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Detail panel */}
      <ProspectDetailPanel
        prospect={selectedProspect}
        open={!!selectedProspect}
        onClose={() => setSelectedProspect(null)}
      />
    </div>
  );
}
