"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/media/media-image";
import {
  groupLinesByFloor,
  renderFloorSketch,
  sketchPagesToBlob,
  type FloorSketchPage,
} from "@/lib/measurements/auto-sketch";
import type { MeasurementContext, SiteMeasurementLine } from "@/lib/measurements/types";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type AutoSketchPanelProps = {
  lines: SiteMeasurementLine[];
  context: MeasurementContext;
  sketchUrl?: string | null;
  readOnly: boolean;
  onUpload: (file: File) => Promise<void>;
};

export function AutoSketchPanel({
  lines,
  context,
  sketchUrl,
  readOnly,
  onUpload,
}: AutoSketchPanelProps) {
  const floorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const lastUploadSignature = useRef("");

  const pages = useMemo(() => groupLinesByFloor(lines), [lines]);
  const activePage = pages[activeFloorIndex] ?? null;

  useEffect(() => {
    if (!expanded || pages.length === 0) return;
    const canvas = floorCanvasRef.current;
    if (!canvas || !activePage) return;
    renderFloorSketch(canvas, activePage);
  }, [expanded, pages, activePage]);

  useEffect(() => {
    if (readOnly || pages.length === 0) return;

    const signature = JSON.stringify(pages);
    if (signature === lastUploadSignature.current) return;

    const timer = window.setTimeout(async () => {
      setUploading(true);
      try {
        const blob = await sketchPagesToBlob(pages);
        if (!blob) return;
        const file = new File([blob], "auto-sketch.png", { type: "image/png" });
        await onUpload(file);
        lastUploadSignature.current = signature;
      } catch {
        // Sketch upload is best-effort during autosave.
      } finally {
        setUploading(false);
      }
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [pages, readOnly, onUpload]);

  if (!expanded) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">System sketch</p>
            <p className="text-xs text-muted-foreground">
              Auto-generated from measurement lines, grouped by floor with duplicate
              sizes combined.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
            <ChevronDown className="mr-1 h-4 w-4" />
            Show sketch
          </Button>
        </div>
        {sketchUrl && (
          <p className="mt-2 text-xs text-muted-foreground">
            Latest sketch saved · {pages.length} floor{pages.length === 1 ? "" : "s"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">System sketch</p>
          <p className="text-xs text-muted-foreground">
            Doors and windows are placed on an invisible grid per floor. Identical
            product and dimensions appear once with a quantity badge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="inline-flex items-center text-xs text-muted-foreground">
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Updating sketch…
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
          >
            <ChevronUp className="mr-1 h-4 w-4" />
            Hide sketch
          </Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add product type and width/height on a line to generate the sketch.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {pages.map((page, index) => (
              <Button
                key={page.floor}
                type="button"
                size="sm"
                variant={index === activeFloorIndex ? "default" : "outline"}
                onClick={() => setActiveFloorIndex(index)}
              >
                {page.floor}
                <span className="ml-1 text-xs opacity-80">({page.symbols.length})</span>
              </Button>
            ))}
          </div>

          <canvas
            ref={floorCanvasRef}
            className="w-full rounded border border-border bg-white"
          />

          <FloorSummary page={activePage} />
        </>
      )}

      {sketchUrl && (
        <div className="rounded-md border border-dashed border-border p-2">
          <p className="mb-2 text-xs text-muted-foreground">Saved combined sketch</p>
          <MediaImage
            src={sketchUrl}
            alt="Saved measurement sketch"
            className="max-h-64 w-full rounded object-contain"
          />
        </div>
      )}
    </div>
  );
}

function FloorSummary({ page }: { page: FloorSketchPage | null }) {
  if (!page) return null;

  return (
    <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
      {page.symbols.map((symbol) => (
        <li key={symbol.key}>
          {symbol.product_type} · {symbol.width_mm}×{symbol.height_mm} mm
          {symbol.quantity > 1 ? ` · ×${symbol.quantity}` : ""}
        </li>
      ))}
    </ul>
  );
}
