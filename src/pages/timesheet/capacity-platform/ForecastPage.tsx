import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { CalendarClock } from "lucide-react";
import MonthPicker from "@/components/capacity-platform/forecast/MonthPicker";
import ForecastForm from "@/components/capacity-platform/forecast/ForecastForm";
import ForecastTimeline from "@/components/capacity-platform/forecast/ForecastTimeline";
import FteLossPanel from "@/components/capacity-platform/forecast/FteLossPanel";
import { useQuarterlyForecasts } from "@/hooks/capacity-platform";
import { detectQuarterRollover } from "@/lib/capacity-platform/alerts";

const ForecastPage = () => {
  const initialMonth = useMemo(
    () => format(startOfMonth(new Date()), "yyyy-MM-dd"),
    []
  );
  const [month, setMonth] = useState<string>(initialMonth);
  const forecastsQ = useQuarterlyForecasts();
  const rolloverAlerts = detectQuarterRollover(new Date(), forecastsQ.data);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
        <p className="text-sm text-muted-foreground">
          Rolling monthly forecast (RAG + qualitative gaps + mitigation plan).
          Red RAG requires a non-empty mitigation plan before save.
        </p>
      </header>

      {rolloverAlerts.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 flex items-start gap-2"
        >
          <CalendarClock
            className="h-4 w-4 text-blue-700 dark:text-blue-300 mt-0.5 shrink-0"
            aria-hidden
          />
          <div className="text-sm">
            <strong className="font-semibold text-blue-800 dark:text-blue-200">
              {rolloverAlerts[0].title}
            </strong>{" "}
            <span className="text-blue-900/90 dark:text-blue-100/90">
              {rolloverAlerts[0].description}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside className="rounded-md border p-3 space-y-2 h-fit">
          <h2 className="text-sm font-semibold">Saved months</h2>
          <ForecastTimeline
            selectedMonth={month}
            onSelect={(m) => setMonth(m)}
          />
        </aside>

        <ForecastForm month={month} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">FTE-loss summary</h2>
        <FteLossPanel variant="card" />
      </section>
    </section>
  );
};

export default ForecastPage;
