"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { NewInspectionDialog } from "@/components/qc/new-inspection-dialog";
import { QCInspectionsList } from "@/components/qc/qc-inspections-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listQcInspections, type QcInspection } from "@/lib/api/qc";
import { getGoodsReceipt } from "@/lib/api/procurement";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Plus } from "lucide-react";

function QcReceivingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const grnId = Number(searchParams.get("grn_id") ?? "");
  const { hasPermission } = useAuth();
  const canInspect = hasPermission("qc.inspect");

  const [grnRef, setGrnRef] = useState<string | null>(null);
  const [inspections, setInspections] = useState<QcInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const pendingInspection = inspections.find((i) => i.result === "pending");

  const load = useCallback(() => {
    if (!Number.isFinite(grnId) || grnId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getGoodsReceipt(grnId).catch(() => null),
      listQcInspections({ goods_receipt_id: grnId, per_page: 50 }),
    ])
      .then(([grnRes, inspRes]) => {
        if (grnRes?.data) {
          setGrnRef(grnRes.data.grn_number);
        }
        setInspections(inspRes.data);
      })
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load receiving QC.");
        setInspections([]);
      })
      .finally(() => setLoading(false));
  }, [grnId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!Number.isFinite(grnId) || grnId <= 0) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Open this page from a goods receipt with <code>?grn_id=</code> in the URL.
        </p>
        <Button variant="outline" asChild>
          <Link href="/procurement/goods-receipts">Go to receiving logs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="GRN Quality Inspection"
        subtitle={grnRef ? `Goods receipt ${grnRef}` : `GRN #${grnId}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/procurement/goods-receipts/${grnId}`}>Open GRN</Link>
            </Button>
            {canInspect && (
              <Button size="sm" className="gap-1.5" onClick={() => setNewDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Start QC
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warehouse receiving QC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Quality inspection linked to this goods receipt. Procurement verification remains on the GRN screen.
            </p>
            {pendingInspection && (
              <Button size="sm" asChild>
                <Link href={`/qc/inspections/${pendingInspection.id}`}>
                  Continue inspection {pendingInspection.reference}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <QCInspectionsList
          inspections={inspections}
          loading={loading}
          emptyMessage="No receiving inspections yet. They are created automatically when the GRN enters verifying status."
        />
      </div>

      {canInspect && (
        <NewInspectionDialog
          open={newDialogOpen}
          onOpenChange={setNewDialogOpen}
          defaultContext="warehouse_receiving"
          defaultGoodsReceiptId={grnId}
          onCreated={(id) => router.push(`/qc/inspections/${id}`)}
        />
      )}
    </div>
  );
}

export default function QcReceivingPage() {
  return (
    <PermissionGuard
      permissions={["qc.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view receiving QC.
          </p>
        </div>
      }
    >
      <QcReceivingPageContent />
    </PermissionGuard>
  );
}
