"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmPageContent } from "@/components/crm/crm-page-shell";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  downloadCrmReportExport,
  fetchCrmReports,
  type CrmReport,
} from "@/lib/api/crm/reports";
import { ensureCsrfCookie } from "@/lib/api/client";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PAGE_SIZE = 11;

function ReportCard({
  report,
  selected,
  starred,
  onSelect,
  onToggleStar,
  onExport,
  exporting,
}: {
  report: CrmReport;
  selected: boolean;
  starred: boolean;
  onSelect: (checked: boolean) => void;
  onToggleStar: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  return (
    <div className="space-y-3 rounded-[10px] border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(c) => onSelect(!!c)}
          aria-label={`Select ${report.name}`}
          className="mt-0.5"
        />
        <button
          type="button"
          onClick={onToggleStar}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-amber-500"
          aria-label={starred ? "Unstar report" : "Star report"}
        >
          <Star
            className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-500")}
          />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="text-left text-sm font-semibold text-primary hover:underline"
            onClick={onExport}
            disabled={exporting}
          >
            {report.name}
          </button>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {report.description}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
        <div>
          <p className="text-muted-foreground">Records</p>
          <p className="mt-0.5 font-medium text-foreground">
            {report.record_count ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Folder</p>
          <p className="mt-0.5 font-medium text-foreground">{report.folder}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onExport}
        disabled={exporting}
      >
        <Download className="h-3.5 w-3.5" />
        {exporting ? "Exporting…" : "Export CSV"}
      </Button>
    </div>
  );
}

export function CrmReportsList() {
  const [reports, setReports] = useState<CrmReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [folder, setFolder] = useState("All Reports");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchCrmReports()
      .then(setReports)
      .catch(() => {
        setReports([]);
        setLoadError("Could not load export reports.");
      })
      .finally(() => setLoading(false));
  }, []);

  const folderFilters = useMemo(() => {
    const folders = Array.from(new Set(reports.map((r) => r.folder))).sort();
    return ["All Reports", ...folders];
  }, [reports]);

  const handleExport = async (reportId: string) => {
    setExportingId(reportId);
    try {
      await ensureCsrfCookie();
      await downloadCrmReportExport(reportId);
    } finally {
      setExportingId(null);
    }
  };

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      const matchesFolder =
        folder === "All Reports" || report.folder === folder;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        report.name.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        report.folder.toLowerCase().includes(q);
      return matchesFolder && matchesSearch;
    });
  }, [folder, search, reports]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const end = Math.min(start + PAGE_SIZE, total);

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((r) => selected.has(r.id));

  function toggleAllOnPage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      pageItems.forEach((r) => {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      });
      return next;
    });
  }

  function toggleStar(id: string) {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pagination = (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? (
          "Showing 0 reports"
        ) : (
          <>
            Showing {start + 1} to {end} of {total} report{total !== 1 ? "s" : ""}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-[5px]"
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          className="h-8 w-8 rounded-[5px] bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label={`Page ${currentPage}`}
        >
          {currentPage}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-[5px]"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <CrmPageContent>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Select
          value={folder}
          onValueChange={(v) => {
            setFolder(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-background text-sm sm:w-[200px]">
            <SelectValue placeholder="All Reports" />
          </SelectTrigger>
          <SelectContent>
            {folderFilters.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="relative min-w-0 w-full sm:w-[min(100%,280px)] md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search All Reports"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-[5px] border-border bg-background pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex flex-1 sm:flex-none">
                  <Button
                    size="sm"
                    className="h-9 w-full gap-1.5 rounded-[5px] px-4 text-sm font-medium sm:w-auto"
                    disabled
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">Create Report</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming in Phase 2</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Export reports unavailable</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : (
        <>
      {/* Mobile / tablet: card list */}
      <div className="space-y-3 md:hidden">
        {pageItems.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No reports match your search.
          </p>
        ) : (
          pageItems.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              selected={selected.has(report.id)}
              starred={starred.has(report.id)}
              onSelect={(checked) => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(report.id);
                  else next.delete(report.id);
                  return next;
                });
              }}
              onToggleStar={() => toggleStar(report.id)}
              onExport={() => handleExport(report.id)}
              exporting={exportingId === report.id}
            />
          ))
        )}
        {total > 0 && (
          <div className="rounded-[10px] border border-border/80 bg-card shadow-sm">
            {pagination}
          </div>
        )}
      </div>

      {/* Desktop: fixed-column table (no overlap) */}
      <div className="hidden min-w-0 overflow-hidden rounded-[10px] border border-border/80 bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-11" />
              <col className="w-11" />
              <col className="w-[24%]" />
              <col className="w-[36%]" />
              <col className="w-[20%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-3 text-left align-middle">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={(c) => toggleAllOnPage(!!c)}
                    aria-label="Select all reports on page"
                  />
                </th>
                <th className="px-1 py-3" aria-hidden />
                <th className="px-2 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                  Report Name
                </th>
                <th className="px-2 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                  Description
                </th>
                <th className="px-2 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                  Records
                </th>
                <th className="px-3 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                  Export
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No reports match your search.
                  </td>
                </tr>
              ) : (
                pageItems.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-border/60 hover:bg-muted/20"
                  >
                    <td className="px-3 py-3 align-middle">
                      <Checkbox
                        checked={selected.has(report.id)}
                        onCheckedChange={(c) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (c) next.add(report.id);
                            else next.delete(report.id);
                            return next;
                          });
                        }}
                        aria-label={`Select ${report.name}`}
                      />
                    </td>
                    <td className="px-1 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => toggleStar(report.id)}
                        className="text-muted-foreground hover:text-amber-500"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            starred.has(report.id) &&
                              "fill-amber-400 text-amber-500"
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <button
                        type="button"
                        className="line-clamp-2 text-left text-sm font-medium text-primary hover:underline"
                        onClick={() => handleExport(report.id)}
                        disabled={exportingId === report.id}
                      >
                        {report.name}
                      </button>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {report.description}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-middle text-sm text-muted-foreground">
                      {report.record_count ?? "—"}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleExport(report.id)}
                        disabled={exportingId === report.id}
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination}
      </div>
        </>
      )}
    </CrmPageContent>
  );
}
