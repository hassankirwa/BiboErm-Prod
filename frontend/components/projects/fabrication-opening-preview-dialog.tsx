"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MediaImage } from "@/components/media/media-image";
import {
  getProjectBom,
  tagProjectDocumentBom,
  type ProjectBomLine,
  type ProjectDocument,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";
import { ImageIcon, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type FabricationOpeningPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  document: ProjectDocument | null;
  readOnly?: boolean;
  onTagged?: (document: ProjectDocument) => void;
};

function formatMm(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return `${num} mm`;
}

function formatQty(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function packagingText(packaging: unknown): string | null {
  if (packaging == null) return null;
  if (typeof packaging === "string") {
    const trimmed = packaging.trim();
    return trimmed !== "" ? trimmed : null;
  }
  if (Array.isArray(packaging)) {
    const parts = packaging.map(String).map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof packaging === "object") {
    const notes = (packaging as { notes?: unknown }).notes;
    if (Array.isArray(notes)) {
      const parts = notes.map(String).map((s) => s.trim()).filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : null;
    }
    try {
      return JSON.stringify(packaging);
    } catch {
      return null;
    }
  }
  return null;
}

function MaterialSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="overflow-hidden rounded-md border border-border">
        {children}
      </div>
    </section>
  );
}

function MaterialTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="bg-muted/50 text-muted-foreground">
        <tr>
          {headers.map((header) => (
            <th key={header} className="px-2.5 py-1.5 font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t border-border">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-2.5 py-1.5 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FabricationOpeningPreviewDialog({
  open,
  onOpenChange,
  projectId,
  document,
  readOnly = false,
  onTagged,
}: FabricationOpeningPreviewDialogProps) {
  const meta = document?.metadata ?? null;
  const code = meta?.code ?? document?.filename ?? "Opening";
  const series = meta?.series ?? null;
  const dims = meta?.dimensions ?? null;
  const showImage =
    Boolean(document) &&
    (meta?.has_elevation_image === true ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(document?.filename ?? ""));

  const frameProfiles = meta?.frame_profiles ?? [];
  const sashProfiles = meta?.sash_profiles ?? [];
  const hardware = meta?.hardware ?? [];
  const glass = meta?.glass ?? [];
  const sashOpenings = meta?.sash_openings ?? [];
  const packaging = packagingText(meta?.packaging);

  const [bomLines, setBomLines] = useState<ProjectBomLine[]>([]);
  const [loadingBom, setLoadingBom] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const suggestedIds = useMemo(() => {
    if (!meta?.code || bomLines.length === 0) return [];
    const needle = String(meta.code).toLowerCase();
    return bomLines
      .filter((line) => (line.notes ?? "").toLowerCase().includes(needle))
      .map((line) => line.id);
  }, [bomLines, meta?.code]);

  useEffect(() => {
    if (!open || !document || readOnly) {
      if (readOnly) {
        setBomLines([]);
        setLoadingBom(false);
      }
      return;
    }

    const existing = meta?.bom_tags?.bom_line_ids ?? [];
    setSelectedIds(existing.map(Number).filter((id) => Number.isFinite(id)));

    let cancelled = false;
    setLoadingBom(true);
    void getProjectBom(projectId)
      .then((response) => {
        if (cancelled) return;
        const bom = response.data;
        setBomLines(bom.lines ?? []);
        if ((meta?.bom_tags?.bom_line_ids?.length ?? 0) === 0) {
          const needle = String(meta?.code ?? "").toLowerCase();
          if (needle) {
            const suggested = (bom.lines ?? [])
              .filter((line) => (line.notes ?? "").toLowerCase().includes(needle))
              .map((line) => line.id);
            if (suggested.length > 0) {
              setSelectedIds(suggested);
            }
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setBomLines([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBom(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, document?.id, projectId, readOnly]);

  async function handleSaveTags() {
    if (!document) return;
    setSaving(true);
    try {
      const response = await tagProjectDocumentBom(projectId, document.id, selectedIds);
      toast.success(
        selectedIds.length > 0
          ? `Tagged ${selectedIds.length} BOM line${selectedIds.length === 1 ? "" : "s"}.`
          : "BOM tags cleared.",
      );
      onTagged?.(response.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save BOM tags.");
    } finally {
      setSaving(false);
    }
  }

  function toggleLine(id: number, checked: boolean) {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((value) => value !== id),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "fixed inset-3 z-50 flex h-auto max-h-none w-auto max-w-none flex-col gap-0 overflow-hidden rounded-lg p-0",
          "sm:max-w-none",
          "top-3 right-3 bottom-3 left-3 translate-x-0 translate-y-0",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-3 pr-12 text-left">
          <DialogTitle className="text-xl">
            {code}
            {series ? <span className="font-normal text-muted-foreground"> · {series}</span> : null}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Fabrication opening preview with materials and BOM tagging
          </DialogDescription>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Badge variant="outline">Qty {formatQty(meta?.quantity)}</Badge>
            {meta?.colour ? <Badge variant="outline">Colour {String(meta.colour)}</Badge> : null}
            {(dims?.width_mm != null || dims?.height_mm != null) && (
              <Badge variant="outline">
                W {dims?.width_mm ?? "—"} × H {dims?.height_mm ?? "—"} mm
              </Badge>
            )}
            {(meta?.bom_tags?.bom_line_ids?.length ?? 0) > 0 ? (
              <Badge className="bg-emerald-600">
                Tagged · {meta?.bom_tags?.bom_line_ids?.length} BOM
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1",
            readOnly
              ? "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)]"
              : "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(280px,0.9fr)]",
          )}
        >
          {/* Left — elevation */}
          <div className="flex min-h-[220px] items-center justify-center border-b border-border bg-muted/30 p-4 md:border-b-0 md:border-r">
            {document && showImage ? (
              <MediaImage
                src={document.url}
                alt={String(code)}
                className="max-h-full max-w-full object-contain"
                fallback={
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-12 w-12" />
                    <p className="text-sm">Elevation unavailable</p>
                  </div>
                }
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-12 w-12" />
                <p className="text-sm">No elevation image in workbook</p>
              </div>
            )}
          </div>

          {/* Center — legend rows + materials */}
          <ScrollArea className="min-h-0 border-b border-border md:border-b-0 md:border-r">
            <div className="space-y-5 p-4">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Legend & quantities
                </h3>
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        ["Code", String(code)],
                        ["Series", series || "—"],
                        ["Quantity", formatQty(meta?.quantity)],
                        ["Colour", meta?.colour ? String(meta.colour) : "—"],
                        ["Width", formatMm(dims?.width_mm)],
                        ["Height", formatMm(dims?.height_mm)],
                        ["Area", dims?.sqm != null ? `${dims.sqm} m²` : "—"],
                        ["Weight", dims?.weight_kg != null ? `${dims.weight_kg} kg` : "—"],
                        ["Sill height", dims?.sill_height != null ? formatMm(dims.sill_height) : "—"],
                      ].map(([label, value]) => (
                        <tr key={label} className="border-t border-border first:border-t-0">
                          <th className="w-[38%] bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                            {label}
                          </th>
                          <td className="px-3 py-2 font-medium">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {meta?.description ? (
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                ) : null}
                {packaging ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Packaging:</span> {packaging}
                  </p>
                ) : null}
              </section>

              <MaterialSection title="Frame profiles" empty={frameProfiles.length === 0}>
                <MaterialTable
                  headers={["Name", "Code", "Length", "Qty"]}
                  rows={frameProfiles.map((row) => [
                    row.name ?? "—",
                    row.code_no ?? "—",
                    formatMm(row.length_mm),
                    formatQty(row.qty),
                  ])}
                />
              </MaterialSection>

              <MaterialSection title="Sash profiles" empty={sashProfiles.length === 0}>
                <MaterialTable
                  headers={["Name", "Code", "Length", "Qty"]}
                  rows={sashProfiles.map((row) => [
                    row.name ?? "—",
                    row.code_no ?? "—",
                    formatMm(row.length_mm),
                    formatQty(row.qty),
                  ])}
                />
              </MaterialSection>

              <MaterialSection title="Hardware" empty={hardware.length === 0}>
                <MaterialTable
                  headers={["Name", "Spec", "Qty"]}
                  rows={hardware.map((row) => [
                    row.name ?? "—",
                    row.specification ?? "—",
                    formatQty(row.qty),
                  ])}
                />
              </MaterialSection>

              <MaterialSection title="Glass" empty={glass.length === 0}>
                <MaterialTable
                  headers={["Name", "W × H", "Spec", "Qty"]}
                  rows={glass.map((row) => [
                    row.name ?? "—",
                    `${row.width_mm ?? "—"} × ${row.height_mm ?? "—"} mm`,
                    row.specification ?? "—",
                    formatQty(row.qty),
                  ])}
                />
              </MaterialSection>

              <MaterialSection title="Sash openings" empty={sashOpenings.length === 0}>
                <MaterialTable
                  headers={["Type", "W × H", "Qty"]}
                  rows={sashOpenings.map((row) => [
                    row.type ?? row.opening ?? "—",
                    `${row.width_mm ?? "—"} × ${row.height_mm ?? "—"} mm`,
                    formatQty(row.qty),
                  ])}
                />
              </MaterialSection>
            </div>
          </ScrollArea>

          {/* Right — BOM tags (PM only) */}
          {!readOnly && (
            <div className="flex min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tag BOM
                </h3>
                {suggestedIds.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedIds(suggestedIds)}
                  >
                    Suggest from notes
                  </Button>
                ) : null}
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="p-3">
                  {loadingBom ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading BOM…
                    </div>
                  ) : bomLines.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                      No BOM on this project yet. Import a BOM first, then tag lines to this
                      opening.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {bomLines.map((line) => {
                        const checked = selectedIds.includes(line.id);
                        const label = [
                          line.material_code,
                          line.material_name,
                          line.measurement_mm != null ? `${line.measurement_mm} mm` : null,
                          `Qty ${line.quantity}`,
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <label
                            key={line.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-xs hover:bg-muted/50",
                              checked && "bg-primary/5",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleLine(line.id, value === true)
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0 leading-snug">
                              <span className="font-medium">{label}</span>
                              {line.notes ? (
                                <span className="mt-0.5 block text-muted-foreground line-clamp-2">
                                  {line.notes}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {bomLines.length > 0 ? (
                <div className="shrink-0 border-t border-border p-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => void handleSaveTags()}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Tag className="mr-2 h-4 w-4" />
                    )}
                    Save BOM tags
                    {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
