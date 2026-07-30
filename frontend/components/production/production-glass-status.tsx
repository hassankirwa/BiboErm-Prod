"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createGlassOrder,
  listGlassOrders,
  type GlassOrder,
  type GlassOrderPane,
} from "@/lib/api/procurement";
import type { GlassAssemblyContext } from "@/lib/api/production";
import { getProjectBom, type ProjectBomLine } from "@/lib/api/projects";
import { toast } from "sonner";

type Props = {
  projectId: number;
  projectReference?: string | null;
  projectName?: string | null;
  productionOrderId?: number;
  glassAssembly?: GlassAssemblyContext;
};

type DisplayGlassLine = {
  key: string;
  code: string | null;
  material: string;
  quantity: string | number;
  width_mm: number | string | null;
  height_mm: number | string | null;
  notes: string | null;
  source: "glass_order" | "bom";
};

function isGlassLine(line: ProjectBomLine) {
  return line.is_glass || line.line_type === "glass";
}

function buildSpecsFromBomLines(lines: ProjectBomLine[]) {
  const glassLines = lines.filter(isGlassLine);
  return {
    source: "project_bom",
    requirements: "",
    panes: glassLines.map((line) => ({
      name: line.material_name,
      width_mm: line.width_mm ?? line.measurement_mm,
      height_mm: line.height_mm ?? null,
      quantity: Number(line.quantity) || 1,
      glass_type: line.material_code ?? "",
      notes: line.notes ?? "",
      bom_line_id: line.id,
    })),
  };
}

function findMatchingPane(
  line: ProjectBomLine,
  panes: GlassOrderPane[],
  index: number,
): GlassOrderPane | null {
  const byBomId = panes.find((pane) => pane.bom_line_id === line.id);
  if (byBomId) return byBomId;

  const lineWidth = Number(line.width_mm ?? line.measurement_mm);
  const lineQty = Number(line.quantity);
  const byDims = panes.find((pane) => {
    const sameName =
      (pane.name ?? "").trim().toLowerCase() ===
      (line.material_name ?? "").trim().toLowerCase();
    const sameWidth =
      lineWidth > 0 && Number(pane.width_mm) > 0 && Number(pane.width_mm) === lineWidth;
    const sameQty =
      Number.isFinite(lineQty) &&
      Number(pane.quantity) > 0 &&
      Number(pane.quantity) === lineQty;
    return sameName && (sameWidth || sameQty);
  });
  if (byDims) return byDims;

  return panes[index] ?? null;
}

/** Prefer glass-order pane dimensions — especially height filled during procurement. */
function buildDisplayGlassLines(
  bomLines: ProjectBomLine[],
  order: GlassOrder | null,
): DisplayGlassLine[] {
  const panes = order?.specs?.panes ?? [];

  if (bomLines.length > 0) {
    return bomLines.map((line, index) => {
      const pane = findMatchingPane(line, panes, index);
      return {
        key: `bom-${line.id}`,
        code: line.material_code ?? pane?.glass_type ?? null,
        material: line.material_name || pane?.name || `Glass ${index + 1}`,
        quantity: pane?.quantity ?? line.quantity,
        width_mm: pane?.width_mm ?? line.width_mm ?? line.measurement_mm ?? null,
        height_mm: pane?.height_mm ?? line.height_mm ?? null,
        notes: pane?.notes || line.notes || null,
        source: pane?.height_mm != null || pane?.width_mm != null ? "glass_order" : "bom",
      };
    });
  }

  return panes.map((pane, index) => ({
    key: `pane-${index}`,
    code: pane.glass_type ?? null,
    material: pane.name || `Pane ${index + 1}`,
    quantity: pane.quantity ?? 1,
    width_mm: pane.width_mm ?? null,
    height_mm: pane.height_mm ?? null,
    notes: pane.notes ?? null,
    source: "glass_order" as const,
  }));
}

function GlassBomTable({ lines }: { lines: DisplayGlassLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No glass lines on the project BOM yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Material</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">W (mm)</TableHead>
            <TableHead className="text-right">H (mm)</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.key}>
              <TableCell className="font-mono text-xs">{line.code || "—"}</TableCell>
              <TableCell>{line.material}</TableCell>
              <TableCell className="text-right">{line.quantity}</TableCell>
              <TableCell className="text-right">{line.width_mm ?? "—"}</TableCell>
              <TableCell className="text-right">{line.height_mm ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground text-xs max-w-[12rem] truncate">
                {line.notes ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ProductionGlassStatus({
  projectId,
  projectReference,
  projectName,
  productionOrderId,
  glassAssembly,
}: Props) {
  const router = useRouter();
  const [glassOrder, setGlassOrder] = useState<GlassOrder | null>(null);
  const [bomGlassLines, setBomGlassLines] = useState<ProjectBomLine[]>([]);
  const [creating, setCreating] = useState(false);

  const orderHref = glassOrder
    ? `/procurement/glass-orders/${glassOrder.id}${
        productionOrderId
          ? `?returnTo=${encodeURIComponent(`/production/orders/${productionOrderId}`)}`
          : ""
      }`
    : null;

  const load = useCallback(() => {
    return Promise.all([
      listGlassOrders({ project_id: projectId, per_page: 1 }),
      getProjectBom(projectId).catch(() => null),
    ])
      .then(([ordersRes, bomRes]) => {
        setGlassOrder(ordersRes.data[0] ?? null);
        const lines = bomRes?.data.lines ?? [];
        setBomGlassLines(lines.filter(isGlassLine));
      })
      .catch(() => {
        /* procurement read optional */
      });
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayLines = useMemo(
    () => buildDisplayGlassLines(bomGlassLines, glassOrder),
    [bomGlassLines, glassOrder],
  );

  async function handleCreateFromBom() {
    setCreating(true);
    try {
      const bomRes = await getProjectBom(projectId);
      const specs = buildSpecsFromBomLines(bomRes.data.lines ?? []);
      if ((specs.panes?.length ?? 0) === 0) {
        toast.error("No glass lines found on the project BOM.");
        return;
      }
      const res = await createGlassOrder({
        project_id: projectId,
        specs,
        notes: "Created from project BOM — complete dimensions and requirements before ordering.",
      });
      setGlassOrder(res.data);
      toast.success("Glass order created from BOM");
      router.push(
        `/procurement/glass-orders/${res.data.id}${
          productionOrderId
            ? `?returnTo=${encodeURIComponent(`/production/orders/${productionOrderId}`)}`
            : ""
        }`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create glass order"));
    } finally {
      setCreating(false);
    }
  }

  const projectLabel = projectName ?? `Project #${projectId}`;
  const projectHref = `/projects/${projectId}?tab=production`;
  const bomGlassCount = bomGlassLines.length;

  if (glassAssembly?.requires_glass === false) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No glass in the project BOM — glass assembly can be skipped on the production order.
        </p>
        <p className="text-xs text-muted-foreground">
          Project:{" "}
          <Link href={projectHref} className="text-primary hover:underline">
            {projectReference ? `${projectLabel} · ${projectReference}` : projectLabel}
          </Link>
        </p>
      </div>
    );
  }

  if (!glassOrder) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {glassAssembly?.requires_glass
            ? "Glass is required but no order is on file yet. It is normally created when fabrication completes."
            : "No glass order on file. Glass is created when fabrication completes."}
        </p>
        <p className="text-xs text-muted-foreground">
          Project:{" "}
          <Link href={projectHref} className="font-medium text-primary hover:underline">
            {projectReference ? `${projectLabel} · ${projectReference}` : projectLabel}
          </Link>
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium">BOM glass lines</p>
          <GlassBomTable lines={displayLines} />
        </div>
        <PermissionGate anyOf={["procurement.glass.manage", "procurement.manage"]}>
          {bomGlassCount > 0 ? (
            <Button size="sm" onClick={handleCreateFromBom} disabled={creating}>
              {creating ? "Creating…" : "Create glass order from BOM"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Upload and finalize a BOM with glass lines on the project before creating an order.
            </p>
          )}
        </PermissionGate>
      </div>
    );
  }

  const delivered = glassOrder.status === "delivered";
  const cancelled = glassOrder.status === "cancelled";
  const canEditOrder = !delivered && !cancelled;
  const linkedProject = glassOrder.project;
  const dimsFromOrder = displayLines.some((line) => line.source === "glass_order");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {glassOrder.order_number && <span className="font-medium">{glassOrder.order_number}</span>}
        <Badge variant={delivered ? "default" : "outline"}>
          {glassOrder.status.replace(/_/g, " ")}
        </Badge>
        {orderHref ? (
          canEditOrder ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={orderHref}>Edit glass order</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link href={orderHref}>View glass order</Link>
            </Button>
          )
        ) : null}
        {glassOrder.status === "draft" ? (
          <PermissionGate anyOf={["procurement.glass.manage", "procurement.manage"]}>
            {orderHref ? (
              <Button size="sm" asChild>
                <Link href={orderHref}>Prepare &amp; procure</Link>
              </Button>
            ) : null}
          </PermissionGate>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Project:{" "}
        <Link
          href={`/projects/${glassOrder.project_id}?tab=procurement`}
          className="font-medium text-primary hover:underline"
        >
          {linkedProject?.reference
            ? `${linkedProject.name ?? projectLabel} · ${linkedProject.reference}`
            : projectReference
              ? `${projectLabel} · ${projectReference}`
              : projectLabel}
        </Link>
      </p>
      {glassOrder.status === "draft" ? (
        <p className="text-xs text-muted-foreground">
          Complete supplier, requirements, and pane dimensions on the glass order before marking
          as ordered.
        </p>
      ) : null}
      {glassAssembly?.requires_glass && !delivered && (
        <p className="text-xs text-muted-foreground">
          Glass assembly cannot start until the order is marked delivered in procurement.
        </p>
      )}
      {glassAssembly?.requires_glass && delivered && (
        <p className="text-xs text-green-700 dark:text-green-400">
          Glass is on site — you can start glass assembly.
        </p>
      )}
      <div className="space-y-2 pt-1">
        <p className="text-sm font-medium">
          {dimsFromOrder ? "Glass lines (dims from glass order)" : "BOM glass lines"}
        </p>
        <GlassBomTable lines={displayLines} />
      </div>
    </div>
  );
}
