"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { QcDefectsList } from "@/components/qc/qc-defects-list";
import { QcDefectStats } from "@/components/qc/qc-defect-stats";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listQcDefects,
  updateQcDefect,
  type QcDefect,
  type QcDefectSeverity,
  type QcDefectStatus,
} from "@/lib/api/qc";
import { useAuth } from "@/contexts/auth-context";
import { Search } from "lucide-react";
import { toast } from "sonner";

function QcDefectsPageContent() {
  const { hasPermission } = useAuth();
  const canResolve =
    hasPermission("qc.defects.resolve") || hasPermission("qc.manage");

  const [defects, setDefects] = useState<QcDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Parameters<typeof listQcDefects>[0] = { per_page: 100 };
    if (statusFilter !== "all") params.status = statusFilter as QcDefectStatus;
    if (severityFilter !== "all") params.severity = severityFilter as QcDefectSeverity;
    if (debouncedSearch) params.search = debouncedSearch;

    listQcDefects(params)
      .then((res) => setDefects(res.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load defects.");
        setDefects([]);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, severityFilter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const openCount = defects.filter((d) => d.status === "open").length;
  const inProgressCount = defects.filter((d) => d.status === "in_progress").length;
  const resolvedCount = defects.filter((d) => d.status === "resolved").length;
  const waivedCount = defects.filter((d) => d.status === "waived").length;

  const handleResolve = async (defect: QcDefect) => {
    try {
      await updateQcDefect(defect.id, { status: "resolved" });
      toast.success("Defect marked resolved.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update defect.");
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="QC Defects"
        subtitle="Non-conformance and quality issues from inspections"
      />
      <div className="space-y-6 p-6">
        <QcDefectStats
          openCount={openCount}
          inProgressCount={inProgressCount}
          resolvedCount={resolvedCount}
          waivedCount={waivedCount}
          loading={loading}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search defects..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <QcDefectsList
          defects={defects}
          loading={loading}
          canResolve={canResolve}
          onResolve={handleResolve}
        />
      </div>
    </div>
  );
}

export default function QcDefectsPage() {
  return (
    <PermissionGuard
      permissions={["qc.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view QC defects.
          </p>
        </div>
      }
    >
      <QcDefectsPageContent />
    </PermissionGuard>
  );
}
