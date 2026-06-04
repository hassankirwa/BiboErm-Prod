"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listQcInspections, type QcInspection } from "@/lib/api/qc";
import { useAuth } from "@/contexts/auth-context";
import { ShieldCheck } from "lucide-react";

type GrnQcLinkProps = {
  grnId: number;
};

function qcStatusLabel(inspections: QcInspection[]): string | null {
  if (inspections.length === 0) return null;
  const pending = inspections.find((i) => i.result === "pending");
  if (pending) return "pending";
  const failed = inspections.find((i) => i.result === "fail");
  if (failed) return "fail";
  const latest = inspections[0];
  return latest?.result ?? null;
}

function QcStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  switch (status) {
    case "pending":
      return <Badge variant="outline">QC pending</Badge>;
    case "pass":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">QC pass</Badge>;
    case "fail":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">QC fail</Badge>;
    case "conditional_pass":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">QC conditional</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function GrnQcLink({ grnId }: GrnQcLinkProps) {
  const { hasPermission } = useAuth();
  const canView = hasPermission("qc.view");
  const [inspections, setInspections] = useState<QcInspection[]>([]);

  useEffect(() => {
    if (!canView || !Number.isFinite(grnId)) return;
    listQcInspections({ goods_receipt_id: grnId, per_page: 10 })
      .then((res) => setInspections(res.data))
      .catch(() => setInspections([]));
  }, [canView, grnId]);

  if (!canView) return null;

  const status = qcStatusLabel(inspections);
  const pendingInspection = inspections.find((i) => i.result === "pending");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <QcStatusBadge status={status} />
      {pendingInspection ? (
        <Button size="sm" className="gap-1.5" asChild>
          <Link href={`/qc/inspections/${pendingInspection.id}`}>
            <ShieldCheck className="h-4 w-4" />
            Continue QC
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href={`/qc/receiving?grn_id=${grnId}`}>
            <ShieldCheck className="h-4 w-4" />
            Open QC inspection
          </Link>
        </Button>
      )}
    </div>
  );
}
