"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  extractProjectBom,
  finalizeProjectBom,
  getProject,
  getProjectBom,
  importProjectBom,
  projectHasBomFinalized,
  projectHasDesignDocument,
  type BomExtractedLine,
  type BomExtractionResult,
  type BomResolutionStatus,
  type ProjectBom,
  type ProjectDetail,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { MaterialCodeSearch } from "@/components/warehouse/material-code-search";

const BOM_UPLOAD_PERMISSIONS = ["projects.bom.upload", "projects.manage"] as const;

function normalizeExtractionResult(data: BomExtractionResult): BomExtractionResult {
  return {
    ...data,
    lines: Array.isArray(data.lines) ? data.lines : [],
    summary: data.summary ?? {
      total_rows: 0,
      matched: 0,
      unmatched: 0,
      procurement_only: 0,
    },
    source_filename: data.source_filename ?? null,
  };
}

function hasExtractPreviewLines(preview: BomExtractionResult | null): boolean {
  return (preview?.lines?.length ?? 0) > 0;
}

type ProjectDetailBomProps = {
  project: ProjectDetail;
  readOnly?: boolean;
  onProjectUpdated: (project: ProjectDetail) => void;
};

const RESOLUTION_LABELS: Record<BomResolutionStatus, string> = {
  matched: "Matched",
  unmatched: "Unmatched",
  procurement_only: "Procurement only",
};

function resolutionBadgeClass(status: BomResolutionStatus): string {
  switch (status) {
    case "matched":
      return "bg-success/10 text-success border-success/30";
    case "unmatched":
      return "bg-warning/10 text-warning border-warning/30";
    case "procurement_only":
      return "bg-muted text-muted-foreground";
  }
}

export function ProjectDetailBom({
  project,
  readOnly = false,
  onProjectUpdated,
}: ProjectDetailBomProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bom, setBom] = useState<ProjectBom | null>(null);
  const [extractPreview, setExtractPreview] = useState<BomExtractionResult | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(true);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function loadBom() {
    setLoading(true);
    try {
      const response = await getProjectBom(project.id);
      const loaded = response.data;
      setBom(loaded);

      const hasSavedLines = (loaded.lines?.length ?? 0) > 0;
      if (hasSavedLines) {
        setExtractPreview(null);
        setPreviewFile(null);
        setShowUploadZone(false);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load BOM.");
      setBom(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBom();
  }, [project.id]);

  async function handleExtract(file: File) {
    setExtracting(true);
    try {
      const response = await extractProjectBom(project.id, file);
      const normalized = normalizeExtractionResult(response.data);
      setExtractPreview(normalized);
      setPreviewFile(file);
      setShowUploadZone(false);
      toast.success(
        `Parsed ${normalized.summary.total_rows} lines — review and confirm import.`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to parse BOM file.");
      setExtractPreview(null);
      setPreviewFile(null);
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!extractPreview || !hasExtractPreviewLines(extractPreview)) return;

    setImporting(true);
    try {
      const response = await importProjectBom(project.id, {
        lines: extractPreview.lines,
        extracted_data: extractPreview,
        file: previewFile ?? undefined,
      });
      setBom(response.data);
      setExtractPreview(null);
      setPreviewFile(null);
      setShowUploadZone(false);
      toast.success(`BOM v${response.data.version} imported (${response.data.lines.length} lines).`);
      const refreshed = await getProject(project.id);
      onProjectUpdated(refreshed.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to import BOM.");
    } finally {
      setImporting(false);
    }
  }

  function handleDiscardPreview() {
    setExtractPreview(null);
    setPreviewFile(null);
    setShowUploadZone(true);
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      const response = await finalizeProjectBom(project.id);
      setBom(response.data);
      toast.success("BOM finalized — warehouse material check will start.");
      const refreshed = await getProject(project.id);
      onProjectUpdated(refreshed.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to finalize BOM.");
    } finally {
      setFinalizing(false);
    }
  }

  const isDraft = bom?.status === "draft";
  const isBomPrepStage = project.stage === "final_design_approval";
  const hasDesign = projectHasDesignDocument(project);
  const bomFinalized = projectHasBomFinalized(project);
  const lineCount = bom?.lines.length ?? 0;
  const hasImportedLines = lineCount > 0;
  const previewLines = extractPreview?.lines ?? [];
  const showPreview = hasExtractPreviewLines(extractPreview);
  const showUploadDropZone = showUploadZone && !bomFinalized;

  function cardSubtitle(): string {
    if (bomFinalized && bom?.version) {
      return `Version ${bom.version} · finalized`;
    }
    if (hasImportedLines && bom?.version) {
      return `Version ${bom.version} · ${bom.status} · ${lineCount} line${lineCount === 1 ? "" : "s"}`;
    }
    if (showPreview) {
      return `${extractPreview?.source_filename ?? "Uploaded file"} · ${previewLines.length} lines ready to import`;
    }
    return "Upload an Excel (.xlsx) or CSV BOM sheet";
  }

  return (
    <div className="space-y-6">
      {!loading && isBomPrepStage ? (
        bomFinalized ? (
          <Alert className="border-success/30 bg-success/10 text-success [&>svg]:text-success">
            <CheckCircle2 />
            <AlertTitle>BOM finalized</AlertTitle>
            <AlertDescription className="text-success/80">
              Project is ready for warehouse material check.
            </AlertDescription>
          </Alert>
        ) : hasImportedLines ? (
          <Alert className="border-success/30 bg-success/10 text-success [&>svg]:text-success">
            <CheckCircle2 />
            <AlertTitle>
              BOM imported — v{bom?.version}, {lineCount} line{lineCount === 1 ? "" : "s"}
            </AlertTitle>
            <AlertDescription className="text-success/80">
              {isDraft
                ? "Review lines below, then finalize to start the warehouse material check."
                : "BOM saved successfully."}
              {isDraft && !hasDesign
                ? " A design document is still required on the Designs tab before finalizing."
                : null}
            </AlertDescription>
          </Alert>
        ) : showPreview ? (
          <Alert className="border-primary/30 bg-primary/5">
            <FileSpreadsheet className="text-primary" />
            <AlertTitle>BOM preview ready</AlertTitle>
            <AlertDescription>
              {extractPreview!.summary.matched} matched, {extractPreview!.summary.unmatched}{" "}
              unmatched, {extractPreview!.summary.procurement_only} procurement-only. Confirm import
              to save.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-warning/30 bg-warning/10 text-warning [&>svg]:text-warning">
            <AlertCircle />
            <AlertTitle>BOM preparation</AlertTitle>
            <AlertDescription className="text-warning/90">
              Upload an Excel or CSV BOM, review extracted lines, then confirm import and
              finalize. Unmatched SKUs can be resolved later in procurement or warehouse.
              {!hasDesign ? " No design document on file yet." : null}
            </AlertDescription>
          </Alert>
        )
      ) : null}

      {!loading && project.stage === "site_assessment" && hasImportedLines && isDraft ? (
        <Alert className="border-info/30 bg-info/10 text-info [&>svg]:text-info">
          <AlertCircle />
          <AlertTitle>BOM ready to advance</AlertTitle>
          <AlertDescription className="text-info/90">
            Finalize is available after you advance this project to Final design approval.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Bill of Materials</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{cardSubtitle()}</p>
          </div>
          {bom?.status ? (
            <Badge
              variant="secondary"
              className={
                bom.status === "finalized"
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              }
            >
              {bom.status}
            </Badge>
          ) : showPreview ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              preview
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly ? (
          <>
          <div className="max-w-md">
            <MaterialCodeSearch
              placeholder="Find material by code for BOM"
              onSelect={(item) => {
                toast.info(`Found ${item.sku}. Use import/edit flow to add this line.`);
              }}
            />
          </div>
          <PermissionGate anyOf={[...BOM_UPLOAD_PERMISSIONS]}>
            {showUploadDropZone ? (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (!extracting && !importing) fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!extracting && !importing) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  if (extracting || importing) return;
                  const file = event.dataTransfer.files[0];
                  if (file) void handleExtract(file);
                }}
                onClick={() => {
                  if (!extracting && !importing) fileInputRef.current?.click();
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
                  (extracting || importing) && "pointer-events-none opacity-60",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                {extracting ? (
                  <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                ) : (
                  <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
                )}
                <p className="text-sm font-medium">
                  {extracting ? "Parsing spreadsheet…" : "Drop BOM file here or click to upload"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Excel (.xlsx, .xls), CSV, or JSON — extract first, then confirm import
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Columns: Material Name, Material Code, Quantity, Line Type, Length (mm), Notes
                </p>
              </div>
            ) : null}

            {!showUploadDropZone && !bomFinalized ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={extracting || importing}
                  onClick={() => {
                    if (showPreview) {
                      handleDiscardPreview();
                      return;
                    }
                    setShowUploadZone(true);
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Replace file
                </Button>
                {showPreview ? (
                  <span className="text-xs text-muted-foreground">
                    {extractPreview?.source_filename ?? "Current file"} · {previewLines.length} lines
                    parsed
                  </span>
                ) : hasImportedLines ? (
                  <span className="text-xs text-muted-foreground">
                    v{bom?.version} · {lineCount} lines imported
                  </span>
                ) : null}
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
              disabled={extracting || importing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleExtract(file);
              }}
            />

            {showPreview ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleConfirmImport} disabled={importing}>
                    {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm import ({previewLines.length} lines)
                  </Button>
                  <Button
                    variant="outline"
                    disabled={importing}
                    onClick={handleDiscardPreview}
                  >
                    Discard preview
                  </Button>
                </div>
                <BomLinesTable mode="preview" lines={previewLines} />
              </div>
            ) : null}
          </PermissionGate>

          <PermissionGate permission="projects.bom.finalize">
            {isBomPrepStage && isDraft && hasImportedLines && !showPreview ? (
              <Button
                disabled={finalizing || !hasDesign}
                onClick={handleFinalize}
              >
                {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Finalize BOM
              </Button>
            ) : null}
          </PermissionGate>
          </>
          ) : null}
        </CardContent>
      </Card>

      {!showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">BOM lines</CardTitle>
            {hasImportedLines ? (
              <p className="text-xs text-muted-foreground">
                Version {bom?.version} · {lineCount} saved line{lineCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading BOM…</p>
            ) : !hasImportedLines ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No BOM lines yet. Upload a spreadsheet to get started.
              </p>
            ) : (
              <BomLinesTable mode="saved" lines={bom!.lines} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type PreviewRow = BomExtractedLine;

type SavedRow = ProjectBom["lines"][number];

function BomLinesTable({
  mode,
  lines,
}: {
  mode: "preview" | "saved";
  lines: PreviewRow[] | SavedRow[];
}) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {mode === "preview" ? <TableHead className="w-12">#</TableHead> : null}
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Material</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Length (mm)</TableHead>
            {mode === "saved" ? (
              <TableHead className="text-right">Bars (nested)</TableHead>
            ) : null}
            {mode === "saved" ? <TableHead>Flags</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mode === "preview"
            ? (lines as PreviewRow[]).map((line) => (
                <TableRow key={line.row_number}>
                  <TableCell className="text-muted-foreground text-xs">
                    {line.row_number}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", resolutionBadgeClass(line.resolution_status))}
                    >
                      {RESOLUTION_LABELS[line.resolution_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{line.line_type}</TableCell>
                  <TableCell>{line.material_code ?? "—"}</TableCell>
                  <TableCell>{line.material_name}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{line.measurement_mm ?? "—"}</TableCell>
                </TableRow>
              ))
            : (lines as SavedRow[]).map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.is_procurement_only ? (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", resolutionBadgeClass("procurement_only"))}
                      >
                        Procurement only
                      </Badge>
                    ) : line.warehouse_item ? (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", resolutionBadgeClass("matched"))}
                      >
                        Matched
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", resolutionBadgeClass("unmatched"))}
                      >
                        Unmatched
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{line.line_type}</TableCell>
                  <TableCell>{line.material_code ?? "—"}</TableCell>
                  <TableCell>{line.material_name}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{line.measurement_mm ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {line.line_type === "aluminium_profile"
                      ? (line.bars_needed ?? "—")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {line.is_glass ? (
                        <Badge variant="outline" className="text-[10px]">
                          Glass
                        </Badge>
                      ) : null}
                      {line.is_procurement_only ? (
                        <Badge variant="outline" className="text-[10px]">
                          Procurement
                        </Badge>
                      ) : null}
                      {line.warehouse_item ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {line.warehouse_item.sku}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
