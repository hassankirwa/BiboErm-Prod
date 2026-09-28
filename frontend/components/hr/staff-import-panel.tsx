"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import {
  discardStaffImportExtract,
  extractStaffImport,
  importStaffRows,
  type StaffImportPreviewRow,
} from "@/lib/api/hr";
import { toast } from "sonner";

function syncBadge(status?: "new" | "changed" | "unchanged", fields?: string[]) {
  if (status === "new") return <Badge className="bg-emerald-600">New</Badge>;
  if (status === "changed") {
    return (
      <Badge className="max-w-full whitespace-normal break-words bg-amber-600">
        Updated{fields?.length ? `: ${fields.join(", ")}` : ""}
      </Badge>
    );
  }
  return <Badge variant="outline">Unchanged</Badge>;
}

export function StaffImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string | null>(null);
  const [rows, setRows] = useState<StaffImportPreviewRow[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    new: number;
    changed: number;
    unchanged: number;
    with_photos: number;
    warnings: number;
  } | null>(null);
  const [busy, setBusy] = useState<"extract" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearPreview = useCallback(async (discard = true) => {
    const current = tokenRef.current;
    setRows([]);
    setSummary(null);
    setToken(null);
    tokenRef.current = null;
    if (discard && current) {
      try {
        await discardStaffImportExtract(current);
      } catch {
        /* ignore cleanup errors */
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      const current = tokenRef.current;
      if (current) {
        void discardStaffImportExtract(current).catch(() => undefined);
      }
    };
  }, []);

  const handleExtract = async (file: File) => {
    setBusy("extract");
    setError(null);
    await clearPreview(true);
    try {
      const result = await extractStaffImport(file);
      setRows(result.data.rows);
      setSummary(result.data.summary);
      setToken(result.data.extract_token);
      tokenRef.current = result.data.extract_token;
      toast.success(`Extracted ${result.data.summary.total} staff rows.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to extract workbook."
          : "Unable to extract workbook."
      );
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setBusy("import");
    setError(null);
    try {
      const result = await importStaffRows({
        rows,
        extract_token: token,
      });
      toast.success(
        `Import done — created ${result.data.created}, updated ${result.data.updated}, skipped ${result.data.skipped}.`
      );
      tokenRef.current = null;
      await clearPreview(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to import staff."
          : "Unable to import staff."
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff import</h1>
        <p className="text-sm text-muted-foreground">
          Extract the staff master Excel, preview photos and mapping, then import by BWD staff number.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workbook</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="max-w-md"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleExtract(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null || rows.length === 0}
            onClick={() => void clearPreview(true)}
          >
            Clear preview
          </Button>
          <Button
            type="button"
            disabled={busy !== null || rows.length === 0}
            onClick={() => void handleImport()}
          >
            {busy === "import" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Import {rows.length ? `(${rows.length})` : ""}
          </Button>
          {busy === "extract" && (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Extracting…
            </span>
          )}
        </CardContent>
      </Card>

      {summary && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">Total {summary.total}</Badge>
          <Badge className="bg-emerald-600">New {summary.new}</Badge>
          <Badge className="bg-amber-600">Changed {summary.changed}</Badge>
          <Badge variant="outline">Unchanged {summary.unchanged}</Badge>
          <Badge variant="outline">Photos {summary.with_photos}</Badge>
          <Badge variant="outline">Warnings {summary.warnings}</Badge>
        </div>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Staff no.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Warnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row.employee_number ?? "row"}-${index}`}>
                    <TableCell>
                      {row.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={String(row.avatar_url)}
                          alt=""
                          className="size-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.employee_number || "—"}
                    </TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {row.email ? String(row.email) : (
                        <span className="text-muted-foreground">No email (invite later)</span>
                      )}
                    </TableCell>
                    <TableCell>{row.department || "—"}</TableCell>
                    <TableCell>{row.job_title || "—"}</TableCell>
                    <TableCell>
                      {syncBadge(row._sync_status, row._changed_fields)}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-amber-700">
                      {(row._warnings ?? []).join("; ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
