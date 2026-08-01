"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { QuotationPreviewDocument } from "@/components/projects/quotation-preview-document";
import { QuotationPdfDownloadButton } from "@/components/projects/quotation-pdf-download-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createWorkspaceQuotation,
  extractQuotationExcel,
  extractQuotationFromAccount,
  fetchFabricationFromAccount,
  fetchQuotationFormAccounts,
  formatKes,
  formatUsd,
  type PendingQuotationAccount,
  type QuotationAccountingLine,
  type StructuredQuotationLinePayload,
} from "@/lib/api/projects/quotations";
import { ApiError } from "@/lib/api/errors";
import {
  lineKesTotal,
  lineUsdTotal,
  quotationHasUsdLines,
} from "@/lib/currency/quotation-pricing";
import { buildQuotationExchangeRate } from "@/lib/currency/usd-to-kes";
import { useUsdToKesRate } from "@/lib/currency/use-usd-to-kes-rate";
import { resolveLinePictureFields } from "@/lib/quotation-fabrication";
import { quotationDetailPath, quotationListPath, quotationNewPath } from "@/lib/quotations/paths";
import { formatQuotationStatus } from "@/lib/quotations/status";
import { cn } from "@/lib/utils";
import { ChevronLeft, FileSpreadsheet, Loader2, RefreshCw, Save, Upload } from "lucide-react";
import { toast } from "sonner";

function accountingLineToPayload(
  line: QuotationAccountingLine,
  index: number,
): StructuredQuotationLinePayload {
  return {
    description: line.description,
    series: line.series ?? null,
    code: line.code ?? null,
    glass_type: line.glass_type ?? null,
    width_mm: line.width_mm ?? null,
    height_mm: line.height_mm ?? null,
    sqm_per_pcs: line.sqm_per_pcs ?? null,
    total_sqm: line.total_sqm ?? null,
    quantity: line.quantity,
    unit_price: line.unit_price,
    metadata: line.metadata ?? null,
    sort_order: index,
    ...resolveLinePictureFields(line),
  };
}

export default function NewProjectQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam =
    searchParams.get("accountId") ?? searchParams.get("projectId");
  const designJobIdParam = searchParams.get("designJobId");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fabricationInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const extractRequestIdRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [fabricationDragOver, setFabricationDragOver] = useState(false);
  const {
    rateInfo,
    effectiveRate,
    loading: loadingRate,
    error: rateError,
    manualOverride,
    setManualOverride,
    isManual,
    refresh: refreshRate,
  } = useUsdToKesRate();

  const [pendingAccounts, setPendingAccounts] = useState<PendingQuotationAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingFabrication, setLoadingFabrication] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fabricationFile, setFabricationFile] = useState<File | null>(null);
  const [savedFabrication, setSavedFabrication] = useState<{ filename: string } | null>(null);
  const [lines, setLines] = useState<StructuredQuotationLinePayload[]>([]);
  const [extractedSubtotal, setExtractedSubtotal] = useState<number | null>(null);
  const [form, setForm] = useState({
    account_id: accountIdParam ?? "",
    project_name: "",
    project_number: "",
    tax_rate: "16",
  });

  const loadFabricationForAccount = useCallback(async (accountId: number) => {
    setLoadingFabrication(true);
    try {
      const result = await fetchFabricationFromAccount(accountId);
      const filename = result.design_document?.filename ?? "saved fabrication";
      setSavedFabrication({ filename });
      setForm((f) => ({
        ...f,
        project_name: result.project?.name ?? result.project_name ?? f.project_name,
        project_number: result.project?.order_no ?? result.project_number ?? f.project_number,
      }));
    } catch (err) {
      setSavedFabrication(null);
      toast.error(
        err instanceof ApiError ? err.message : "Could not load saved fabrication for this account.",
      );
    } finally {
      setLoadingFabrication(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoadingAccounts(true);
      try {
        const preferredAccountId = accountIdParam ? Number(accountIdParam) : null;
        const preferredDesignJobId = designJobIdParam ? Number(designJobIdParam) : null;
        const accounts = await fetchQuotationFormAccounts({
          includeAccountId:
            preferredAccountId != null && Number.isFinite(preferredAccountId)
              ? preferredAccountId
              : null,
          includeDesignJobId:
            preferredDesignJobId != null && Number.isFinite(preferredDesignJobId)
              ? preferredDesignJobId
              : null,
        });
        setPendingAccounts(accounts);

        const preferredMatch =
          preferredAccountId != null && Number.isFinite(preferredAccountId)
            ? accounts.find((account) => account.id === preferredAccountId)
            : null;
        const designJobMatch =
          !preferredMatch && preferredDesignJobId != null && Number.isFinite(preferredDesignJobId)
            ? accounts.find((account) => account.latest_design_job_id === preferredDesignJobId)
            : null;
        const unquotedAccounts = accounts.filter(
          (account) => !account.latest_quotation && !account.has_quotation,
        );
        const initialAccount =
          preferredMatch ?? designJobMatch ?? unquotedAccounts[0] ?? null;

        if (initialAccount) {
          setForm((f) => ({
            ...f,
            account_id: String(initialAccount.id),
            project_name: initialAccount.name,
          }));
          if (initialAccount.has_design_document) {
            await loadFabricationForAccount(initialAccount.id);
          }
        } else {
          setForm((f) => ({
            ...f,
            account_id: "",
            project_name: "",
            project_number: "",
          }));
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load accounts.");
      } finally {
        setLoadingAccounts(false);
      }
    })();
  }, [accountIdParam, designJobIdParam, loadFabricationForAccount]);

  function handleAccountChange(accountId: string) {
    const match = pendingAccounts.find((account) => String(account.id) === accountId);
    setForm((f) => ({
      ...f,
      account_id: accountId,
      project_name: match?.name ?? "",
      project_number: "",
    }));
    setLines([]);
    setUploadFile(null);
    setFabricationFile(null);
    setSavedFabrication(null);
    setExtractedSubtotal(null);
    if (accountId && match?.has_design_document) {
      void loadFabricationForAccount(Number(accountId));
    }
  }

  const useAccountFabrication = Boolean(
    savedFabrication && (!fabricationFile || fabricationFile.size === 0),
  );

  const exchangeRate = useMemo(
    () => buildQuotationExchangeRate(rateInfo, effectiveRate, isManual),
    [rateInfo, effectiveRate, isManual],
  );

  const selectedAccount = useMemo(
    () => pendingAccounts.find((account) => String(account.id) === form.account_id) ?? null,
    [form.account_id, pendingAccounts],
  );

  const hasUsdLines = useMemo(() => quotationHasUsdLines(lines), [lines]);

  const previewQuotation = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
    const taxRate = parseFloat(form.tax_rate) || 16;
    const tax = subtotal * (taxRate / 100);
    return {
      id: 0,
      quotation_number: form.project_number || "DRAFT",
      project_name: form.project_name,
      project_number: form.project_number,
      deal_id: 0,
      account_id: Number(form.account_id) || null,
      contact_id: null,
      prepared_by: null,
      status: "draft",
      subtotal,
      discount_amount: 0,
      tax_amount: tax,
      tax_rate: taxRate,
      total_amount: subtotal + tax,
      valid_until: null,
      terms_conditions: null,
      sent_at: null,
      accepted_at: null,
      revision_of_id: null,
      lines: lines.map((line, index) => ({
        id: index,
        quotation_id: 0,
        description: line.description,
        series: line.series ?? null,
        code: line.code ?? null,
        glass_type: line.glass_type ?? null,
        width_mm: line.width_mm ?? null,
        height_mm: line.height_mm ?? null,
        sqm_per_pcs: line.sqm_per_pcs ?? null,
        total_sqm: line.total_sqm ?? null,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.quantity * line.unit_price,
        sort_order: index,
        metadata: line.metadata ?? null,
        ...resolveLinePictureFields(line),
      })),
      created_at: null,
      updated_at: null,
    };
  }, [form, lines]);

  const handleExtract = useCallback(async (file: File, fabFile?: File | null) => {
    const requestId = ++extractRequestIdRef.current;
    setExtracting(true);
    try {
      const localFab = fabFile ?? fabricationFile;
      const uploadedFab = localFab && localFab.size > 0 ? localFab : null;
      const accountIdForMerge =
        !uploadedFab && useAccountFabrication && form.account_id
          ? Number(form.account_id)
          : null;

      const result = await extractQuotationExcel(file, uploadedFab, accountIdForMerge);
      if (requestId !== extractRequestIdRef.current) return;

      setUploadFile(file);
      setLines(result.lines.map(accountingLineToPayload));
      setExtractedSubtotal(result.summary.subtotal ?? null);
      setForm((f) => ({
        ...f,
        project_name: result.project?.name ?? result.project_name ?? f.project_name,
        project_number: result.project?.order_no ?? result.project_number ?? f.project_number,
      }));
      const enriched = uploadedFab ?? (accountIdForMerge ? savedFabrication : null);
      toast.success(
        enriched
          ? `Extracted ${result.summary.total_items} lines and merged fabrication from ${uploadedFab?.name ?? savedFabrication?.filename}`
          : `Extracted ${result.summary.total_items} priced lines from ${file.name}`,
      );
    } catch (err) {
      if (requestId !== extractRequestIdRef.current) return;
      toast.error(err instanceof ApiError ? err.message : "Could not parse accounting file.");
    } finally {
      if (requestId === extractRequestIdRef.current) {
        setExtracting(false);
      }
    }
  }, [fabricationFile, form.account_id, savedFabrication, useAccountFabrication]);

  const handleFabricationPick = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setSavedFabrication(null);
      setFabricationFile(file);
      if (uploadFile) {
        await handleExtract(uploadFile, file);
      } else {
        toast.success(`Fabrication file ready: ${file.name}. Upload accounting sheet to merge.`);
      }
    },
    [handleExtract, uploadFile],
  );

  function pickFile(file: File | null | undefined) {
    if (file) void handleExtract(file, fabricationFile);
  }

  async function handleLoadSavedDocuments() {
    if (!form.account_id) {
      toast.error("Select an account first.");
      return;
    }
    setExtracting(true);
    try {
      const result = await extractQuotationFromAccount(Number(form.account_id));
      setLines(result.lines.map(accountingLineToPayload));
      setExtractedSubtotal(result.summary.subtotal ?? null);
      setForm((f) => ({
        ...f,
        project_name: result.project?.name ?? result.project_name ?? f.project_name,
        project_number: result.project?.order_no ?? result.project_number ?? f.project_number,
      }));
      if (selectedAccount?.design_document?.filename) {
        setSavedFabrication({ filename: selectedAccount.design_document.filename });
      }
      if (selectedAccount?.accounting_document?.filename) {
        setUploadFile(new File([], selectedAccount.accounting_document.filename));
      }
      toast.success("Loaded saved fabrication and accounting documents for this account.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load saved documents.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!form.account_id) {
      toast.error("Select an account.");
      return;
    }
    if (lines.length === 0) {
      toast.error("Upload an accounting sheet or add at least one line.");
      return;
    }

    setSaving(true);
    try {
      const accountingFile = uploadFile && uploadFile.size > 0 ? uploadFile : null;
      const fabFile = fabricationFile && fabricationFile.size > 0 ? fabricationFile : null;
      const quotation = await createWorkspaceQuotation(
        {
          account_id: Number(form.account_id),
          project_name: form.project_name,
          project_number: form.project_number,
          tax_rate: parseFloat(form.tax_rate) || 16,
          lines,
        },
        accountingFile,
        fabFile,
      );
      toast.success("Proforma quotation draft saved.");
      router.push(quotationDetailPath(quotation.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(index: number, field: keyof StructuredQuotationLinePayload, value: string) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (field === "quantity" || field === "unit_price") {
          const parsed = value.trim() === "" ? 0 : Number.parseFloat(value);
          return { ...line, [field]: Number.isFinite(parsed) ? parsed : 0 };
        }
        return { ...line, [field]: value };
      }),
    );
  }

  const pricingSummary = useMemo(() => {
    const subtotalKes = lines.reduce(
      (sum, line) => sum + lineKesTotal(line, hasUsdLines ? effectiveRate : null),
      0,
    );
    const taxRate = parseFloat(form.tax_rate) || 16;
    const tax = subtotalKes * (taxRate / 100);
    const subtotalUsd = lines.reduce((sum, line) => sum + lineUsdTotal(line), 0);
    return { subtotalKes, subtotalUsd, tax, grandTotal: subtotalKes + tax };
  }, [effectiveRate, form.tax_rate, hasUsdLines, lines]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="New Proforma Quotation"
        subtitle="Fabrication loads from the design job — upload the accounting sheet to price and save"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={quotationListPath()}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || lines.length === 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Draft
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAccount?.latest_quotation ? (
              <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">This project already has a quotation</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedAccount.latest_quotation.project_name ?? selectedAccount.name}
                  {" · "}
                  {formatQuotationStatus(selectedAccount.latest_quotation.status)}
                  {selectedAccount.latest_quotation.quotation_number
                    ? ` · ${selectedAccount.latest_quotation.quotation_number}`
                    : ""}
                </p>
                <div className="mt-3">
                  <Button size="sm" asChild>
                    <Link href={quotationDetailPath(selectedAccount.latest_quotation.id)}>
                      Open existing quotation
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                {loadingAccounts ? (
                  <Spinner className="h-5 w-5" />
                ) : pendingAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No accounts ready for quotation. Approve measurements for an
                    active account that does not already have a quotation.
                  </p>
                ) : (
                  <select
                    id="account"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.account_id}
                    onChange={(e) => handleAccountChange(e.target.value)}
                  >
                    <option value="">Select account</option>
                    {pendingAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                        {account.latest_quotation
                          ? " (quotation exists)"
                          : account.draft_quotations_count > 0
                            ? " (draft exists)"
                            : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_name">Project Name</Label>
                <Input
                  id="project_name"
                  value={form.project_name}
                  onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_number">Project No.</Label>
                <Input
                  id="project_number"
                  value={form.project_number}
                  onChange={(e) => setForm((f) => ({ ...f, project_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_rate">VAT %</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  value={form.tax_rate}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                />
              </div>
            </div>
            {selectedAccount &&
            (selectedAccount.has_design_document ||
              selectedAccount.has_accounting_document ||
              savedFabrication) ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm">
                <span className="text-muted-foreground">Saved on account:</span>
                {savedFabrication || selectedAccount.design_document ? (
                  <Badge variant="secondary">
                    Fabrication:{" "}
                    {savedFabrication?.filename ?? selectedAccount.design_document?.filename}
                    {loadingFabrication ? " (loading…)" : " (ready)"}
                  </Badge>
                ) : null}
                {selectedAccount.accounting_document ? (
                  <Badge variant="secondary">
                    Accounting: {selectedAccount.accounting_document.filename}
                  </Badge>
                ) : null}
                {selectedAccount.has_accounting_document ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={extracting}
                    onClick={() => void handleLoadSavedDocuments()}
                  >
                    Load saved accounting too
                  </Button>
                ) : null}
                {selectedAccount.latest_design_job_id ? (
                  <Button type="button" size="sm" variant="link" className="h-auto px-0" asChild>
                    <Link href={`/design/jobs/${selectedAccount.latest_design_job_id}`}>
                      Open design job
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
            {extractedSubtotal != null ? (
              <div className="mt-4 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">Sheet subtotal (USD): </span>
                {formatUsd(extractedSubtotal)}
              </div>
            ) : null}
            {hasUsdLines ? (
              <div className="mt-4 flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 px-3 py-3 text-sm">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <Label htmlFor="fx_rate" className="text-xs text-muted-foreground">
                    USD → KES rate
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="fx_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={loadingRate ? "Loading…" : "Rate"}
                      value={manualOverride ?? effectiveRate ?? ""}
                      onChange={(e) => {
                        const parsed = Number.parseFloat(e.target.value);
                        setManualOverride(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={loadingRate}
                      onClick={() => void refreshRate()}
                      title="Refresh live rate"
                    >
                      <RefreshCw className={cn("h-4 w-4", loadingRate && "animate-spin")} />
                    </Button>
                  </div>
                  {exchangeRate ? (
                    <p className="text-xs text-muted-foreground">{exchangeRate.label}</p>
                  ) : rateError ? (
                    <p className="text-xs text-destructive">{rateError}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" />
              Accounting Excel Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={fabricationInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                void handleFabricationPick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files[0]);
              }}
              onClick={() => !extracting && fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                extracting && "pointer-events-none opacity-70",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              {extracting ? (
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
              ) : (
                <Upload className="mb-3 h-10 w-10 text-primary/70" />
              )}
              <p className="text-sm font-medium text-foreground">
                {extracting
                  ? "Extracting priced lines…"
                  : savedFabrication
                    ? "Drop accounting / costing sheet here or click to browse"
                    : "Drop accounting Excel here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {savedFabrication
                  ? "Fabrication is already loaded — pricing merges automatically on upload"
                  : "Required — supports .xlsx, .xls, .csv, and .txt"}
              </p>
              {uploadFile ? (
                <p className="mt-3 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  {uploadFile.name}
                </p>
              ) : null}
            </div>

            {!savedFabrication ? (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fabricationInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setFabricationDragOver(true);
                }}
                onDragLeave={() => setFabricationDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setFabricationDragOver(false);
                  void handleFabricationPick(e.dataTransfer.files[0]);
                }}
                onClick={() => !extracting && fabricationInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-6 text-center transition-colors",
                  extracting && "pointer-events-none opacity-70",
                  fabricationDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border/80 bg-muted/10 hover:border-primary/30 hover:bg-muted/20",
                )}
              >
                <p className="text-sm font-medium text-foreground">
                  Optional fabrication BOM (dimensions, glass, elevation drawing)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Merged by W&amp;D code — .xlsx or .xls fabrication list
                </p>
                {fabricationFile ? (
                  <p className="mt-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                    {fabricationFile.name}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/20 px-4 py-4 text-sm">
                <p className="font-medium text-foreground">Fabrication loaded from design</p>
                <p className="mt-1 text-muted-foreground">
                  {savedFabrication.filename} — dimensions and glass details will merge when you upload
                  accounting.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {lines.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Pricing</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[520px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">SQM</TableHead>
                    <TableHead>{hasUsdLines ? "Unit Price (USD)" : "Unit Price"}</TableHead>
                    <TableHead className="text-right">
                      {hasUsdLines ? "Line Total (KES)" : "Line Total"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={`${line.code}-${index}`}>
                      <TableCell>
                        <div className="font-medium">{line.code ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{line.description}</div>
                      </TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">
                        {line.total_sqm?.toFixed(2) ?? line.sqm_per_pcs?.toFixed(2) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={line.unit_price > 0 ? line.unit_price : ""}
                          onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatKes(lineKesTotal(line, hasUsdLines ? effectiveRate : null))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 space-y-1 border-t pt-3 text-sm">
                {hasUsdLines ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal (USD)</span>
                    <span>{formatUsd(pricingSummary.subtotalUsd)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal{hasUsdLines ? " (KES)" : ""}
                  </span>
                  <span>{formatKes(pricingSummary.subtotalKes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({form.tax_rate || 16}%)</span>
                  <span>{formatKes(pricingSummary.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Grand Total (KES)</span>
                  <span>{formatKes(pricingSummary.grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="w-full min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Proforma Quotation Preview</h2>
            {lines.length > 0 ? (
              <QuotationPdfDownloadButton targetRef={previewRef} quotation={previewQuotation} />
            ) : null}
          </div>
          {lines.length > 0 ? (
            <QuotationPreviewDocument
              ref={previewRef}
              quotation={previewQuotation}
              showFabricationDetails={false}
              exchangeRate={hasUsdLines ? exchangeRate : null}
            />
          ) : (
            <Card className="flex min-h-[360px] items-center justify-center">
              <CardContent className="text-center text-sm text-muted-foreground">
                Upload an accounting Excel sheet to preview the BIBO proforma quotation layout.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
