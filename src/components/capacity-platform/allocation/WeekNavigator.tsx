// ============================================================================
// WeekNavigator — prev / this-week / next + ?week=YYYY-MM-DD URL sync
// ----------------------------------------------------------------------------
// The URL is the source of truth. The `week` search param is normalised to
// the ISO Monday on every change. Consumers receive the resolved Monday
// `Date` via the onChange callback (or read it from useSearchParams).
//
// Phase 9 Allocation grid uses this; Phase 10/11 will reuse for the Forecast
// month picker via a parallel component.
// ============================================================================

import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { mondayOf } from "@/lib/capacity-platform/monday";

const WEEK_PARAM = "week";

const parseMondayParam = (raw: string | null): Date => {
  if (!raw) return mondayOf(new Date());
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return mondayOf(new Date());
  return mondayOf(parsed);
};

export interface WeekNavigatorProps {
  onChange?: (monday: Date) => void;
}

const WeekNavigator = ({ onChange }: WeekNavigatorProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(WEEK_PARAM);
  const monday = useMemo(() => parseMondayParam(raw), [raw]);
  const mondayIso = format(monday, "yyyy-MM-dd");
  const friday = addDays(monday, 4);

  // Self-heal: if the URL has a non-Monday or invalid date, normalise it once.
  useEffect(() => {
    if (raw !== mondayIso) {
      const next = new URLSearchParams(searchParams);
      next.set(WEEK_PARAM, mondayIso);
      setSearchParams(next, { replace: true });
    }
    onChange?.(monday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mondayIso]);

  const setWeek = (d: Date) => {
    const next = new URLSearchParams(searchParams);
    next.set(WEEK_PARAM, format(mondayOf(d), "yyyy-MM-dd"));
    setSearchParams(next, { replace: false });
  };

  const goPrev = () => setWeek(addDays(monday, -7));
  const goNext = () => setWeek(addDays(monday, 7));
  const goThis = () => setWeek(new Date());

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Week navigation"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={goPrev}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={goThis}
        className="gap-1"
        aria-label="Jump to this week"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">This week</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={goNext}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="text-sm font-medium ml-1 tabular-nums">
        {format(monday, "EEE d MMM")} – {format(friday, "EEE d MMM yyyy")}
      </div>
    </div>
  );
};

export default WeekNavigator;
