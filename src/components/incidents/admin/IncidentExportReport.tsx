import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths, addMonths, subQuarters, addQuarters, subYears, addYears } from "date-fns";
import { CalendarIcon, Download, FileText, FileSpreadsheet, Search, Loader2, AlertCircle, Check, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IncidentService } from "@/lib/incident-service";
import { fetchCustomers, Customer } from "@/lib/customer-service";
import type { Incident, IncidentProject, IncidentStatus } from "@/types/incident-types";
import { toast } from "@/hooks/use-toast";
import { escapeHtml } from "@/utils/html-generation.utils";
import { csvRowFromFields } from "@/utils/csv-generation.utils";

const STATUS_OPTIONS: IncidentStatus[] = ["New", "Triaged", "In Progress", "Resolved", "Closed"];

function formatMinutes(mins?: number) {
  if (mins == null) return "-";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDt(dt?: string) {
  if (!dt) return "-";
  return format(new Date(dt), "dd/MM/yyyy HH:mm");
}

function statusColor(status: IncidentStatus) {
  const map: Record<IncidentStatus, string> = {
    New: "bg-red-100 text-red-800 border-red-200",
    Triaged: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
    Resolved: "bg-green-100 text-green-800 border-green-200",
    Closed: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return map[status] ?? "";
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function incidentToRow(inc: Incident) {
  return {
    "Incident #": inc.incident_number,
    Title: inc.title,
    Description: inc.description ?? "",
    Status: inc.status,
    Priority: inc.priority?.name ?? "-",
    Category: inc.category?.name ?? "-",
    Project: inc.incident_project?.name ?? "-",
    "Project Key": inc.incident_project?.project_key ?? "-",
    Customer: (inc.incident_project as any)?.customer?.name ?? "-",
    "Assigned To": inc.assignee?.full_name ?? "-",
    "Created By": inc.creator?.full_name ?? "-",
    "Resolved By": inc.resolver?.full_name ?? "-",
    Source: inc.source ?? "-",
    "Created At": formatDt(inc.created_at),
    "Updated At": formatDt(inc.updated_at),
    "Resolved At": formatDt(inc.resolved_at),
    "SLA Due Date": formatDt(inc.sla_due_date),
    "First Response At": formatDt(inc.first_response_at),
    "Response Time": formatMinutes(inc.response_time_minutes ?? undefined),
    "Resolution Time": formatMinutes(inc.resolution_time_minutes ?? undefined),
    "Response SLA Breached": inc.response_sla_breached ? "Yes" : "No",
    "Resolution SLA Breached": inc.resolution_sla_breached ? "Yes" : "No",
    "Auto Assigned": inc.auto_assigned ? "Yes" : "No",
    Escalated: inc.escalated_at ? "Yes" : "No",
    "Escalated At": formatDt(inc.escalated_at),
    "Escalation Reason": inc.escalation_reason ?? "-",
    "Impact Description": inc.impact_description ?? "-",
  };
}

function exportCSV(rows: ReturnType<typeof incidentToRow>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    csvRowFromFields(headers),
    ...rows.map((r) => csvRowFromFields(headers.map((h) => (r as any)[h]))),
  ].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

function exportExcel(rows: ReturnType<typeof incidentToRow>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);

  const escHtml = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerRow = headers.map((h) => `<th>${escHtml(h)}</th>`).join("");
  const dataRows = rows
    .map(
      (r) =>
        `<tr>${headers.map((h) => `<td>${escHtml((r as any)[h])}</td>`).join("")}</tr>`
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8">
    <!--[if gte mso 9]><xml>
      <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>Incidents</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
    </xml><![endif]-->
    <style>
      th { background:#f2f2f2; font-weight:bold; }
      td, th { border:1px solid #ccc; padding:4px 8px; white-space:nowrap; }
    </style>
  </head>
  <body>
    <table border="1">
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${dataRows}</tbody>
    </table>
  </body>
  </html>`;

  download(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    `${filename}.xls`
  );
}

function exportPDF(
  rows: ReturnType<typeof incidentToRow>[],
  filename: string,
  filterSummary: string
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const win = window.open("", "_blank");
  if (!win) throw new Error("Allow popups to export PDF.");

  const tableHeaders = headers.map((h) => `<th>${escapeHtml(String(h))}</th>`).join("");
  const tableRows = rows
    .map(
      (r) =>
        `<tr>${headers
          .map((h) => `<td>${escapeHtml(String((r as any)[h] ?? ''))}</td>`)
          .join("")}</tr>`
    )
    .join("");

  win.document.write(`<!DOCTYPE html><html><head>
    <title>${escapeHtml(filename)}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:20px;font-size:11px}
      h1{font-size:18px;margin-bottom:4px}
      .meta{color:#666;margin-bottom:16px;font-size:11px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;white-space:nowrap}
      th{background:#f2f2f2;font-weight:bold}
      tr:nth-child(even){background:#fafafa}
    </style>
  </head><body>
    <h1>Incident Export Report</h1>
    <p class="meta">${escapeHtml(filterSummary)} &mdash; ${rows.length} incident(s)</p>
    <table>
      <thead><tr>${tableHeaders}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body></html>`);
  win.document.close();
  const triggerPrint = () => win.print();
  if (win.document.readyState === 'complete') {
    setTimeout(triggerPrint, 50);
  } else {
    win.addEventListener('load', triggerPrint, { once: true });
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────
export function IncidentExportReport() {
  // Filter state
  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => endOfMonth(new Date()));
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Preset mode: null = custom (manual pickers), "month" | "quarter" | "year"
  const [preset, setPreset] = useState<"month" | "quarter" | "year" | null>("month");
  const [presetAnchor, setPresetAnchor] = useState<Date>(new Date());

  // Australian Financial Year helpers (1 Jul – 30 Jun)
  const auFYQuarterBounds = (anchor: Date): [Date, Date] => {
    const m = anchor.getMonth();
    const y = anchor.getFullYear();
    if (m >= 6 && m <= 8)  return [new Date(y, 6, 1),  new Date(y, 8, 30, 23, 59, 59)];
    if (m >= 9 && m <= 11) return [new Date(y, 9, 1),  new Date(y, 11, 31, 23, 59, 59)];
    if (m >= 0 && m <= 2)  return [new Date(y, 0, 1),  new Date(y, 2, 31, 23, 59, 59)];
    return                         [new Date(y, 3, 1),  new Date(y, 5, 30, 23, 59, 59)];
  };
  const auFYQuarterLabel = (anchor: Date): string => {
    const m = anchor.getMonth();
    const y = anchor.getFullYear();
    const fyYear = m >= 6 ? y + 1 : y;
    if (m >= 6 && m <= 8)  return `Q1 FY${fyYear}`;
    if (m >= 9 && m <= 11) return `Q2 FY${fyYear}`;
    if (m >= 0 && m <= 2)  return `Q3 FY${fyYear}`;
    return                         `Q4 FY${fyYear}`;
  };
  const auFYLabel = (anchor: Date): string => {
    const m = anchor.getMonth();
    const y = anchor.getFullYear();
    const start = m >= 6 ? y : y - 1;
    return `FY${start + 1} (${start}–${start + 1})`;
  };
  const auFYStart = (anchor: Date): Date => {
    const m = anchor.getMonth();
    const y = anchor.getFullYear();
    return new Date(m >= 6 ? y : y - 1, 6, 1);
  };
  const auFYEnd = (anchor: Date): Date => {
    const m = anchor.getMonth();
    const y = anchor.getFullYear();
    return new Date(m >= 6 ? y + 1 : y, 5, 30, 23, 59, 59);
  };

  const applyPreset = (mode: "month" | "quarter" | "year", anchor: Date) => {
    if (mode === "month") {
      setStartDate(startOfMonth(anchor));
      setEndDate(endOfMonth(anchor));
    } else if (mode === "quarter") {
      const [s, e] = auFYQuarterBounds(anchor);
      setStartDate(s);
      setEndDate(e);
    } else {
      setStartDate(auFYStart(anchor));
      setEndDate(auFYEnd(anchor));
    }
  };

  const selectPreset = (mode: "month" | "quarter" | "year") => {
    setPreset(mode);
    applyPreset(mode, presetAnchor);
  };

  const stepPreset = (direction: 1 | -1) => {
    if (!preset) return;
    let next: Date;
    if (preset === "month") next = direction === 1 ? addMonths(presetAnchor, 1) : subMonths(presetAnchor, 1);
    else if (preset === "quarter") next = direction === 1 ? addQuarters(presetAnchor, 1) : subQuarters(presetAnchor, 1);
    else next = direction === 1 ? addYears(presetAnchor, 1) : subYears(presetAnchor, 1);
    setPresetAnchor(next);
    applyPreset(preset, next);
  };

  const presetLabel = () => {
    if (preset === "month") return format(presetAnchor, "MMMM yyyy");
    if (preset === "quarter") return auFYQuarterLabel(presetAnchor);
    if (preset === "year") return auFYLabel(presetAnchor);
    return null;
  };

  // Combobox open state
  const [customerOpen, setCustomerOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  // Reference data
  const [allProjects, setAllProjects] = useState<IncidentProject[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Report data
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Load reference data once
  useEffect(() => {
    async function load() {
      try {
        const [projects, customers] = await Promise.all([
          IncidentService.getIncidentProjects(),
          fetchCustomers(),
        ]);
        setAllProjects(projects);
        setAllCustomers(customers);
      } catch (e) {
        console.error("Failed to load reference data", e);
      } finally {
        setLoadingRef(false);
      }
    }
    load();
  }, []);

  // Derive projects visible after customer filter
  const visibleProjects =
    selectedCustomer
      ? allProjects.filter((p) => p.customer_id && p.customer_id === selectedCustomer)
      : allProjects;

  // When customer changes, clear project if it no longer belongs to the new customer
  useEffect(() => {
    if (selectedCustomer && selectedProject) {
      const stillValid = visibleProjects.some((p) => p.id === selectedProject);
      if (!stillValid) setSelectedProject(null);
    }
  }, [selectedCustomer]);

  const handleStartDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setStartDate(date);
    if (date > endDate) setEndDate(date);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setEndDate(date);
    if (date < startDate) setStartDate(date);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let projectIds: string[] | undefined;
      if (selectedProject) {
        projectIds = [selectedProject];
      } else if (selectedCustomer) {
        projectIds = visibleProjects.map((p) => p.id);
        if (projectIds.length === 0) {
          setIncidents([]);
          setHasGenerated(true);
          setGenerating(false);
          return;
        }
      }

      const statusFilter = selectedStatus
        ? ([selectedStatus] as IncidentStatus[])
        : undefined;

      const data = await IncidentService.getIncidents({
        incident_project_id: projectIds,
        status: statusFilter,
        date_range: {
          start: startDate.toISOString(),
          end: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).toISOString(),
        },
      });

      const projectMap = new Map(allProjects.map((p) => [p.id, p]));
      const enriched = data.map((inc) => ({
        ...inc,
        incident_project: inc.incident_project
          ? { ...inc.incident_project, customer: projectMap.get(inc.incident_project_id)?.customer }
          : inc.incident_project,
      }));

      setIncidents(enriched as Incident[]);
      setHasGenerated(true);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const rows = incidents.map((inc) => incidentToRow(inc));

  const filterSummary = [
    `${format(startDate, "dd/MM/yyyy")} – ${format(endDate, "dd/MM/yyyy")}`,
    selectedCustomer
      ? `Customer: ${allCustomers.find((c) => c.id === selectedCustomer)?.name ?? ""}`
      : null,
    selectedProject
      ? `Project: ${allProjects.find((p) => p.id === selectedProject)?.name ?? ""}`
      : null,
    selectedStatus ? `Status: ${selectedStatus}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const filename = `incident-export-${format(new Date(), "yyyy-MM-dd")}`;

  const handleExport = (type: "csv" | "excel" | "pdf") => {
    if (!rows.length) return;
    try {
      if (type === "csv") exportCSV(rows, filename);
      else if (type === "excel") exportExcel(rows, filename);
      else exportPDF(rows, filename, filterSummary);
      toast({ title: `Exported as ${type.toUpperCase()}` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  if (loadingRef) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading reference data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Filters Card — matches Timesheet "Report Filters" layout ── */}
      <Card>
        <CardHeader>
          <CardTitle>Export Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Date Range */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-sm font-medium">Date Range</label>

            {/* Preset toggle buttons */}
            <div className="flex flex-wrap gap-2">
              {(["month", "quarter", "year"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={preset === mode ? "default" : "outline"}
                  onClick={() => selectPreset(mode)}
                  className="capitalize"
                >
                  {mode}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={preset === null ? "default" : "outline"}
                onClick={() => setPreset(null)}
              >
                Custom
              </Button>
            </div>

            {/* Preset navigator */}
            {preset !== null && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => stepPreset(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">{presetLabel()}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => stepPreset(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  {format(startDate, "dd/MM/yyyy")} – {format(endDate, "dd/MM/yyyy")}
                </span>
              </div>
            )}

            {/* Manual pickers — only shown in Custom mode */}
            {preset === null && (
              <div className="flex gap-2 items-center flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateSelect}
                      disabled={(d) => (endDate ? d > endDate : false)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <span>to</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>End date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateSelect}
                      disabled={(d) => (startDate ? d < startDate : false)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Customer — matches SelectFilters Customer */}
          <div className="w-full md:w-auto">
            <label className="text-sm font-medium">Customer</label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>span]:line-clamp-1"
                >
                  {selectedCustomer
                    ? allCustomers.find((c) => c.id === selectedCustomer)?.name ?? "All Customers"
                    : "All Customers"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search customers..." />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all-customers"
                        onSelect={() => {
                          setSelectedCustomer(null);
                          setCustomerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", !selectedCustomer ? "opacity-100" : "opacity-0")} />
                        All Customers
                      </CommandItem>
                      {allCustomers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setSelectedCustomer(c.id);
                            setCustomerOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedCustomer === c.id ? "opacity-100" : "opacity-0")} />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Project — matches SelectFilters Project */}
          <div className="w-full md:w-auto">
            <label className="text-sm font-medium">Project</label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={projectOpen}
                  className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>span]:line-clamp-1"
                >
                  {selectedProject
                    ? visibleProjects.find((p) => p.id === selectedProject)?.name ?? "All Projects"
                    : "All Projects"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search projects..." />
                  <CommandList>
                    <CommandEmpty>No project found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all-projects"
                        onSelect={() => {
                          setSelectedProject(null);
                          setProjectOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", !selectedProject ? "opacity-100" : "opacity-0")} />
                        All Projects
                      </CommandItem>
                      {visibleProjects.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => {
                            setSelectedProject(p.id);
                            setProjectOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedProject === p.id ? "opacity-100" : "opacity-0")} />
                          {p.name}
                          {p.customer && (
                            <span className="ml-1 text-muted-foreground text-xs">
                              ({(p.customer as any).name ?? ""})
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status — matches Action Type select style */}
          <div className="w-full md:w-auto">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={selectedStatus ?? ""}
              onValueChange={(v) => setSelectedStatus(v || null)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Report — matches FilterActions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleGenerate}
              size="sm"
              disabled={generating}
              className="whitespace-nowrap"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* ── Export actions + preview ──────────────────────────────────── */}
      {hasGenerated && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>
                  Report Preview{" "}
                  <span className="text-muted-foreground font-normal text-base">
                    ({incidents.length} incident{incidents.length !== 1 ? "s" : ""})
                  </span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs">{filterSummary}</CardDescription>
              </div>
              {incidents.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("csv")}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("excel")}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExport("pdf")}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8" />
                <p>No incidents matched your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Incident #</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[220px]">Title</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Priority</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">Project</TableHead>
                      <TableHead className="whitespace-nowrap">Customer</TableHead>
                      <TableHead className="whitespace-nowrap">Assigned To</TableHead>
                      <TableHead className="whitespace-nowrap">Created By</TableHead>
                      <TableHead className="whitespace-nowrap">Source</TableHead>
                      <TableHead className="whitespace-nowrap">Created At</TableHead>
                      <TableHead className="whitespace-nowrap">Resolved At</TableHead>
                      <TableHead className="whitespace-nowrap">Response Time</TableHead>
                      <TableHead className="whitespace-nowrap">Resolution Time</TableHead>
                      <TableHead className="whitespace-nowrap">Resp. SLA</TableHead>
                      <TableHead className="whitespace-nowrap">Res. SLA</TableHead>
                      <TableHead className="whitespace-nowrap">Escalated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {inc.incident_number}
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <p className="font-medium text-sm line-clamp-2">{inc.title}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("whitespace-nowrap text-xs", statusColor(inc.status))}
                          >
                            {inc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inc.priority ? (
                            <Badge
                              variant="outline"
                              style={{ borderColor: inc.priority.color, color: inc.priority.color }}
                              className="whitespace-nowrap text-xs"
                            >
                              {inc.priority.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {inc.category?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {inc.incident_project?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {(inc.incident_project as any)?.customer?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {inc.assignee?.full_name ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {inc.creator?.full_name ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap capitalize">
                          {inc.source ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDt(inc.created_at)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDt(inc.resolved_at)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatMinutes(inc.response_time_minutes ?? undefined)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatMinutes(inc.resolution_time_minutes ?? undefined)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {inc.response_sla_breached ? (
                            <span className="text-red-600 font-medium">Breached</span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {inc.resolution_sla_breached ? (
                            <span className="text-red-600 font-medium">Breached</span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {inc.escalated_at ? (
                            <span className="text-orange-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
