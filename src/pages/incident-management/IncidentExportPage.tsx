import { Download } from "lucide-react";
import { IncidentExportReport } from "@/components/incidents/admin/IncidentExportReport";

export default function IncidentExportPage() {
  return (
    <div className="container-responsive pt-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Download className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Incident Export
          </h1>
          <p className="text-muted-foreground mt-1">
            Export incidents by project, customer and date range
          </p>
        </div>
      </div>

      <IncidentExportReport />
    </div>
  );
}
