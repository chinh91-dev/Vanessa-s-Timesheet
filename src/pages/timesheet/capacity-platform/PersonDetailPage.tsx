// ============================================================================
// PersonDetailPage — /capacity-platform/people/:id
// ----------------------------------------------------------------------------
// Spec §8.1 — header card + tabs (Profile / Skills / Leave / Allocations /
// Audit). Loads the person's profile from useCapacityProfiles (already
// cached from the People list), so opening the detail page is instant.
// ============================================================================

import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCapacityProfiles } from "@/hooks/capacity-platform";
import PersonProfileTab from "@/components/capacity-platform/people/PersonProfileTab";
import PersonSkillsTab from "@/components/capacity-platform/people/PersonSkillsTab";
import PersonLeaveTab from "@/components/capacity-platform/people/PersonLeaveTab";
import PersonAllocationsTab from "@/components/capacity-platform/people/PersonAllocationsTab";
import PersonAuditTab from "@/components/capacity-platform/people/PersonAuditTab";

const PersonDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profilesQ = useCapacityProfiles();

  if (profilesQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (profilesQ.error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load profile: {(profilesQ.error as Error).message}
      </div>
    );
  }

  const person = (profilesQ.data ?? []).find((p) => p.id === id) ?? null;

  if (!person) {
    return (
      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/capacity-platform/people")}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to People
        </Button>
        <div className="rounded-md border p-6 text-sm text-muted-foreground italic">
          Person not found. They may have been archived.
        </div>
      </div>
    );
  }

  const personLabel = person.full_name ?? person.email ?? person.id.slice(0, 8);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/capacity-platform/people">
            <ArrowLeft className="h-4 w-4" /> People
          </Link>
        </Button>
      </div>

      <header className="rounded-md border p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {personLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {person.email ?? "—"} ·{" "}
            <span className="font-medium">
              {person.employment_type ?? "—"}
            </span>
            {person.weekly_hours != null && (
              <>
                {" "}
                · {person.weekly_hours} h/wk
              </>
            )}
          </p>
        </div>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <PersonProfileTab person={person} />
        </TabsContent>
        <TabsContent value="skills" className="mt-4">
          <PersonSkillsTab userId={person.id} personLabel={personLabel} />
        </TabsContent>
        <TabsContent value="leave" className="mt-4">
          <PersonLeaveTab userId={person.id} />
        </TabsContent>
        <TabsContent value="allocations" className="mt-4">
          <PersonAllocationsTab personId={person.id} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <PersonAuditTab personId={person.id} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default PersonDetailPage;
