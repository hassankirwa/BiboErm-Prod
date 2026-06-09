"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { HrDocumentTable } from "@/components/hr/hr-document-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { fetchMyHrDocuments, type HrDocument } from "@/lib/api/hr-documents";

export default function WorkspaceDocumentsPage() {
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyHrDocuments();
      setDocuments(result.data);
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
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My documents</h1>
        <p className="text-sm text-muted-foreground">
          Company policies and documents assigned to you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available documents</CardTitle>
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
            <HrDocumentTable documents={documents} mode="self" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
