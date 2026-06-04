"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createGlassOrder,
  listGlassOrders,
  type GlassOrder,
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

function buildSpecsFromBomLines(lines: ProjectBomLine[]) {
  const glassLines = lines.filter((line) => line.is_glass || line.line_type === "glass");
  return {
    source: "project_bom",
    requirements: "",
    panes: glassLines.map((line) => ({
      name: line.material_name,
      width_mm: line.measurement_mm,
      height_mm: null,
      quantity: Number(line.quantity) || 1,
      glass_type: line.material_code ?? "",
      notes: line.notes ?? "",
      bom_line_id: line.id,
    })),
  };
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
  const [bomGlassCount, setBomGlassCount] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const editHref = glassOrder
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
        setBomGlassCount(
          lines.filter((line) => line.is_glass || line.line_type === "glass").length,
        );
      })
      .catch(() => {
        /* procurement read optional */
      });
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        {bomGlassCount !== null && bomGlassCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            {bomGlassCount} glass line{bomGlassCount === 1 ? "" : "s"} on the BOM can seed pane
            dimensions.
          </p>
        ) : null}
        <PermissionGate anyOf={["procurement.glass.manage", "procurement.manage"]}>
          {bomGlassCount !== null && bomGlassCount > 0 ? (
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
  const linkedProject = glassOrder.project;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {glassOrder.order_number && <span className="font-medium">{glassOrder.order_number}</span>}
        <Badge variant={delivered ? "default" : "outline"}>
          {glassOrder.status.replace(/_/g, " ")}
        </Badge>
        {editHref ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={editHref}>Edit glass order</Link>
          </Button>
        ) : null}
        {glassOrder.status === "draft" ? (
          <PermissionGate anyOf={["procurement.glass.manage", "procurement.manage"]}>
            {editHref ? (
              <Button size="sm" asChild>
                <Link href={editHref}>Prepare &amp; procure</Link>
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
    </div>
  );
}
