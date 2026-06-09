"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { HrDocumentTable } from "@/components/hr/hr-document-table";
import { HrDocumentUploadDialog } from "@/components/hr/hr-document-upload-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import * as hrApi from "@/lib/api/hr";
import { fetchHrDocuments, type HrDocument } from "@/lib/api/hr-documents";

function HrDocumentsContent() {
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docs, employeeList] = await Promise.all([
        fetchHrDocuments({ per_page: 50 }),
        hrApi.fetchEmployees({ status: "active", per_page: 100 }),
      ]);
      setDocuments(docs.data);
      setEmployees(
        employeeList.data.map((e) => ({ id: e.id, name: e.name }))
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load documents."
          : "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">HR documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload company policies and employee-specific documents.
          </p>
        </div>
        <HrDocumentUploadDialog employees={employees} onUploaded={load} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <HrDocumentTable documents={documents} mode="admin" onChanged={load} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HrDocumentsPage() {
  return (
    <PermissionGuard
      permissions={["hr_documents.manage"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage HR documents.
          </p>
        </div>
      }
    >
      <HrDocumentsContent />
    </PermissionGuard>
  );
}
