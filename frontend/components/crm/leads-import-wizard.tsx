"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { downloadLeadImportTemplate, parseLeadImportCsv } from "@/lib/lead-form-config";
import { importLeads } from "@/lib/api/crm/leads";
import { ensureCsrfCookie } from "@/lib/api/client";

const ACCEPTED_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ACCEPTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

function isAcceptedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
  );
}

export function LeadsImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imported, setImported] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (next: File | null) => {
    setError(null);
    setImported(false);
    if (!next) {
      setFile(null);
      return;
    }
    if (!isAcceptedFile(next)) {
      setError("Please upload a CSV or Excel file (.csv, .xls, .xlsx).");
      setFile(null);
      return;
    }
    setFile(next);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const rows = parseLeadImportCsv(text);
      if (rows.length === 0) {
        setError(
          "No valid rows found. Ensure the file has headers and at least one row with Lead Name and Phone.",
        );
        return;
      }
      await ensureCsrfCookie();
      const result = await importLeads(rows);
      setImportCount(result.data.imported);
      setImported(true);
    } catch {
      setError("Import failed. Check the file format and try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/crm/leads?view=list">
            <ArrowLeft className="h-4 w-4" />
            Leads
          </Link>
        </Button>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-sm font-medium text-foreground">Import leads</span>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-[#1e3a5f]/[0.06] via-transparent to-transparent px-5 py-5 sm:px-6 sm:py-6">
          <h1 className="text-xl font-semibold tracking-tight text-[#1e3a5f] sm:text-2xl">
            Import leads
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Upload a spreadsheet to bulk-create leads. Use the template below to
            ensure columns match our system.
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-sm text-[#1e3a5f]">Upload file</CardTitle>
          <CardDescription className="text-xs">
            Step 1 — Select a CSV or Excel file from your computer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0] ?? null);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <FileSpreadsheet className="mb-3 h-10 w-10 text-[#1e3a5f]/70" />
            <p className="text-sm font-medium text-foreground">
              Drop your file here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports .csv, .xls, and .xlsx
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {file && !imported && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleFile(null)}
              >
                Remove
              </Button>
            </div>
          )}

          {imported && file && (
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Import complete</p>
                <p className="mt-0.5 text-xs text-green-700/90">
                  {importCount} lead{importCount !== 1 ? "s" : ""} imported from{" "}
                  {file.name}.
                </p>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/crm/leads?view=list">View leads</Link>
                </Button>
              </div>
            </div>
          )}

          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            disabled={!file || imported || importing}
            onClick={handleImport}
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importing…" : "Import file"}
          </Button>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Need the correct column layout? Download our template, fill it in,
              then upload it above.
            </p>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={downloadLeadImportTemplate}
            >
              <Download className="h-4 w-4" />
              Download import template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
