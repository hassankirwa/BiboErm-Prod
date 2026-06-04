"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { NewInspectionDialog } from "@/components/qc/new-inspection-dialog";
import { QCInspectionsList } from "@/components/qc/qc-inspections-list";
import { QCStats } from "@/components/qc/qc-stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getQcDashboardSummary,
  listQcInspections,
  QC_CONTEXT_LABELS,
  QC_INSPECTION_CONTEXTS,
  type QcDashboardSummary,
  type QcInspection,
  type QcInspectionContext,
  type QcInspectionResult,
} from "@/lib/api/qc";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

function QcInspectionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canInspect = hasPermission("qc.inspect");

  const projectIdParam = searchParams.get("project_id");
  const contextParam = searchParams.get("context");
  const resultParam = searchParams.get("result");
  const grnIdParam = searchParams.get("goods_receipt_id");

  const [inspections, setInspections] = useState<QcInspection[]>([]);
  const [summary, setSummary] = useState<QcDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contextFilter, setContextFilter] = useState(contextParam ?? "all");
  const [resultFilter, setResultFilter] = useState(resultParam ?? "all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setContextFilter(contextParam ?? "all");
    setResultFilter(resultParam ?? "all");
  }, [contextParam, resultParam]);

  const load = useCallback(() => {
    setLoading(true);

    const params: Parameters<typeof listQcInspections>[0] = { per_page: 100 };
    if (projectIdParam) params.project_id = Number(projectIdParam);
    if (grnIdParam) params.goods_receipt_id = Number(grnIdParam);
    if (contextFilter !== "all") params.context = contextFilter as QcInspectionContext;
    if (resultFilter !== "all") params.result = resultFilter as QcInspectionResult;
    if (debouncedSearch) params.search = debouncedSearch;

    Promise.all([
      listQcInspections(params),
      getQcDashboardSummary().catch(() => ({ data: null })),
    ])
      .then(([inspRes, dashRes]) => {
        setInspections(inspRes.data);
        setSummary(dashRes.data ?? null);
      })
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load inspections.");
        setInspections([]);
      })
      .finally(() => setLoading(false));
  }, [projectIdParam, grnIdParam, contextFilter, resultFilter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const updateUrlFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const q = params.toString();
    router.replace(q ? `/qc/inspections?${q}` : "/qc/inspections");
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="QC Inspections"
        subtitle="Quality control and inspections"
        actions={
          canInspect ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setNewDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Inspection
            </Button>
          ) : undefined
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <QCStats summary={summary} loading={loading} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search inspections..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={contextFilter}
              onValueChange={(v) => {
                setContextFilter(v);
                updateUrlFilter("context", v);
              }}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contexts</SelectItem>
                {QC_INSPECTION_CONTEXTS.map((ctx) => (
                  <SelectItem key={ctx} value={ctx}>
                    {QC_CONTEXT_LABELS[ctx]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={resultFilter}
              onValueChange={(v) => {
                setResultFilter(v);
                updateUrlFilter("result", v);
              }}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="conditional_pass">Conditional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <QCInspectionsList inspections={inspections} loading={loading} />
        </div>
      </div>

      {canInspect && (
        <NewInspectionDialog
          open={newDialogOpen}
          onOpenChange={setNewDialogOpen}
          defaultProjectId={projectIdParam ? Number(projectIdParam) : undefined}
          defaultGoodsReceiptId={grnIdParam ? Number(grnIdParam) : undefined}
          onCreated={(id) => router.push(`/qc/inspections/${id}`)}
        />
      )}
    </div>
  );
}

export default function QCInspectionsPage() {
  return (
    <PermissionGuard
      permissions={["qc.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view QC inspections.
          </p>
        </div>
      }
    >
      <QcInspectionsPageContent />
    </PermissionGuard>
  );
}
