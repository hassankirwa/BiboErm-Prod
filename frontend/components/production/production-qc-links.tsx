"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewInspectionDialog } from "@/components/qc/new-inspection-dialog";
import {
  listQcInspections,
  QC_CONTEXT_LABELS,
  type QcInspection,
  type QcInspectionContext,
} from "@/lib/api/qc";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const PRODUCTION_QC_CONTEXTS: QcInspectionContext[] = [
  "production_qc_pre_check",
  "production_qc_post_fabrication",
];

type Props = {
  productionOrderId: number;
  projectId?: number;
  canViewQc: boolean;
  canInspectQc?: boolean;
};

export function ProductionQcLinks({
  productionOrderId,
  projectId,
  canViewQc,
  canInspectQc = false,
}: Props) {
  const router = useRouter();
  const [inspections, setInspections] = useState<QcInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(() => {
    if (!canViewQc || !productionOrderId) return;
    setLoading(true);
    listQcInspections({
      production_order_id: productionOrderId,
      per_page: 20,
    })
      .then((res) => {
        setInspections(
          res.data.filter((i) =>
            PRODUCTION_QC_CONTEXTS.includes(i.context as QcInspectionContext),
          ),
        );
      })
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load QC inspections")),
      )
      .finally(() => setLoading(false));
  }, [canViewQc, productionOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canViewQc) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading QC inspections…</p>;
  }

  const pending = inspections.filter((i) => i.result === "pending");

  return (
    <div className="space-y-3">
      {inspections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No production QC inspections yet. Pre/post-fabrication inspections are created when
          those stages complete.
        </p>
      ) : (
        <ul className="space-y-2">
          {inspections.map((inspection) => (
            <li key={inspection.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href={`/qc/inspections/${inspection.id}`}
                className="font-medium text-primary hover:underline"
              >
                {inspection.reference}
              </Link>
              <Badge variant="outline">
                {QC_CONTEXT_LABELS[inspection.context as QcInspectionContext] ??
                  inspection.context}
              </Badge>
              <Badge variant="secondary">{inspection.result}</Badge>
              {inspection.result === "pending" && (
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href={`/qc/inspections/${inspection.id}`}>Continue</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canInspectQc && (
        <div className="flex flex-wrap gap-2 pt-1">
          {pending.length === 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              Start QC inspection
            </Button>
          )}
        </div>
      )}

      {canInspectQc && (
        <NewInspectionDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          defaultContext="production_qc_pre_check"
          defaultProjectId={projectId}
          defaultProductionOrderId={productionOrderId}
          onCreated={(id) => {
            load();
            setNewOpen(false);
            router.push(`/qc/inspections/${id}`);
          }}
        />
      )}
    </div>
  );
}
